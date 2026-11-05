# Voice capture: Vosk live, Canary on release

Status: design, not started. Builds on the quick-capture voice mode (`apps/mobile/lib/capture/`,
`android/.../voice/`) and on the on-device AI plan (`2026-11-05-on-device-ai-design.md`).

## 1. Goal

What the person says turns into the right text, so the rules parser reads the right movement. Today
the sheet's final text is Vosk small's, merged from two passes (`engine/merge.dart`). On the
founder's own voice that text was often wrong before the parser even saw it:

- Vosk heard "doce" for "dos" both times it was said ("dos euros en café" saved as 12 €);
- the grammar pass's number words replaced words the free pass had right: "cena" → "cero",
  "camiseta" → "setenta", "cine" → "cinco", "mamá" → "coma", "setenta y dos" → "setenta y doce".

The fix: Vosk keeps writing live while the person speaks; when they let go, a more precise model,
**NVIDIA Canary-180M flash**, transcribes the whole recording again and its text replaces Vosk's
before the parser reads it.

Out of scope here: a language model reading the transcript (Gemma 4 E2B, a later, optional stage,
§9); Italian and Portuguese (they stay Vosk-only, founder ruling); streaming with Canary (it has
none).

## 2. What the spike measured

On the founder's Samsung S25 Ultra (Snapdragon 8 Elite, 12 GB), with one recording of 19 invented
capture phrases in the founder's voice (Spanish, Colombian accent), cut at the pauses, every model on
the phone's CPU. "Errors" counts words that change the movement (amount, name or category).

| Model (runtime) | Errors on 19 phrases | "dos"/"doce" right (of 3) | Per phrase | RAM | Licence |
|---|---|---|---|---|---|
| Vosk small es 0.42, two passes (today) | many | 1 | live | ~300 MB | Apache-2.0 |
| Whisper base q8 (whisper.cpp) | many | 3 | ~1.0 s | 220 MB | MIT |
| Whisper small q8 (whisper.cpp) | few, numbers wrong | 1 | ~1.3 s | 545 MB | MIT |
| Whisper large-v3-turbo q5 (whisper.cpp) | none | 3 | 26 s | — | MIT |
| **Canary-180M flash int8 (sherpa-onnx)** | **~none** | **3** | **0.13 s** | **335 MB** | CC-BY-4.0 |
| Parakeet TDT 0.6B v3 int8 (sherpa-onnx) | 2 | 3 | 0.10 s | 765 MB | CC-BY-4.0 |
| Qwen3-ASR 0.6B Q8 (llama.cpp) | ~none | 3 | 1.8 s | 2 GB | Apache-2.0 |

Canary's slips were spelling only ("Regaló", "Parkin", one "nuevee cincuenta"). Whisper always
encodes 30 s of audio, so it is slow on short phrases; cutting its window made it repeat itself.
Canary's model loads in about 1.3 s, so it must be loaded before the person lets go (§4.3).

The rules parser on Canary's text read **17 of 19 amounts right**, with no model: both "dos" and
"doce", "alquiler ochocientos cincuenta", and the two expenses of "parking cuatro euros, dentista
ciento veinte". Its two misses: "metro uno cincuenta" read as 1 € + 50 € (a parser rule, §7) and
"nuevee cincuenta" (Canary's slip). On Vosk's text it read 11 of 18.

Not measured: a mid-range or low-end phone. The 0.13 s and the 1.3 s load are a high-end phone's.

## 3. Who gets what

The person never chooses a model.

| Phone | Live text | On release |
|---|---|---|
| arm64, at least 3 GB of RAM, not `isLowRamDevice`, language `es` or `en` | Vosk | Canary |
| 32-bit (`armeabi-v7a`), under 3 GB, Android Go, or language `it`/`pt` | Vosk | nothing (Vosk's text, as today) |

The 3 GB line is a guess to check on a real mid-range phone (§10). RAM is
`ActivityManager.MemoryInfo.totalMem`; `isLowRamDevice` catches Android Go.

## 4. How it works

### 4.1 The flow in the sheet

1. **Listening**, as today: Vosk's partials show live (`capture_listening.dart`).
2. The person lets go, or Vosk's pause timer ends the listen (`endOfSpeechPause`).
3. **Refining**: a short state in the same place as the live text, the Vosk text dimmed with a
   small "Refinando…" label (es; en "Refining…", it/pt strings exist too even though those
   languages never show it). No extra tap.
4. Canary's text replaces Vosk's and goes to the parser (`_read`), then the **preview**, as today.

If Canary is not there, fails, or has not answered in **3 s**, Vosk's text goes to the parser and the
preview shows as it does now. The person is never stuck in "Refinando…".

### 4.2 Kotlin (`android/.../voice/`)

- `VoiceChannel.record` keeps every PCM chunk it reads in memory, besides feeding Vosk. It already
  reads 40 ms chunks; the longest listen is 30 s (`longestListen`), so at most ~960 KB. The buffer
  lives only for the recording and is dropped after the refine; it is never written to disk, never
  sent, never logged.
- After `stop`, the channel sends Vosk's final results as today, then, when a precise model is
  installed and loaded for that language:
  - `{type: refining}`;
  - runs Canary (`OfflineRecognizer` from sherpa-onnx's Kotlin API, source and target language the
    capture language, punctuation on) over the buffer on the worker thread;
  - `{type: refined, text}` or `{type: refine_failed, code}`;
  - then `{type: done}`, as today.
- The Canary recognizer is kept loaded like the Vosk model: a second `ModelCache` instance
  (`ModelCache` is already generic), warmed with Vosk's (`warmUp`, the process-start hint,
  `prewarm.dart`), dropped on memory pressure and when the models are deleted.
- `warmUp({modelPath, precisePath})`, `isWarm` and `releaseModels` cover both models.

### 4.3 Dart (`lib/capture/engine/`)

- `VoiceEvent` gains `refining`, `refined(text)` and `refineFailed(code)`.
- `SpeechEngine.listen` keeps its stream of transcripts and gains one signal: a `refining` flag the
  sheet reads (a second stream, or a small event type instead of `String`; the plan picks one). The
  last transcript before the stream closes is Canary's text when it came, otherwise Vosk's merged
  text, so `capture_session.dart`'s `onDone` path does not change.
- `VoskEngine` holds the 3 s limit: if `refined` has not come by then, it closes with Vosk's text and
  ignores what comes later.
- The grammar pass and `mergePasses` stay: they still make the live text and the fallback.

### 4.4 Download (`lib/capture/models_download.dart`, `capture_download.dart`)

- Canary is one more `VoiceModel`-like entry per language that has it (`es`, `en`): one zip with
  `encoder.int8.onnx`, `decoder.int8.onnx` and `tokens.txt`, without the export's `test_wavs`. It is
  sherpa-onnx's int8 export (`sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8`, 154 MB as
  tar.bz2), republished unchanged inside a zip as an asset of a new release, `voice-models-v2`, and
  checked against its SHA-256 before it is unzipped or loaded, like Vosk's. One file serves both
  languages.
- **One opt-in, one size.** On a phone that gets Canary, the first-🎤 offer shows the total (Vosk +
  Canary, about 200–230 MB for Spanish) and downloads both. Vosk goes first, so voice works as soon as it lands;
  Canary follows in the same progress bar. No separate Wi-Fi question.
- **People who already have Vosk** see a one-time offer in the sheet ("Mejorar la precisión, +N MB")
  instead of a silent download; saying no is remembered.
- **Settings → Voz**: one switch, "Mejorar la precisión (+N MB)", which downloads or deletes Canary.
  "Delete the voice models" deletes both.
- Free-space check, resume, corrupt-file and no-space errors: as Vosk's today.

## 5. Licences

- **Canary-180M flash weights: CC-BY-4.0** (NVIDIA's model card: "released under the permissive
  CC-BY-4.0 license"). Debian lists CC-BY-4.0 as DFSG-free. About → licences gets an entry crediting
  NVIDIA, naming the model and the licence, with the licence text, like the Vosk models'.
- **sherpa-onnx: Apache-2.0**, and what its native library carries (kaldi-native-fbank, and
  whatever else its build links), checked from the pinned source as was done for Vosk.
- **onnxruntime: MIT**.
- `scripts/check-licenses.sh` and `licenses.dart` get the new entries; the tests that pin Vosk's and
  JNA's versions get the same for sherpa-onnx and onnxruntime.

## 6. F-Droid: the open risk

F-Droid builds every native library from source on its own server (`docs/mobile/fdroid.md`; today
`build-native-deps.sh` builds Vosk and JNA in about 46 min). Canary needs **sherpa-onnx and
onnxruntime** built from source too:

- sherpa-onnx builds with the NDK in minutes (done in the spike with NDK 28.2 for arm64; its script
  needed `-Wl,--allow-shlib-undefined` and `android-28`).
- **onnxruntime is the risk**: a large C++ build with its own dependencies (protobuf, abseil, and
  more), possibly hours, inside F-Droid's `timeout: 10800`. Its "minimal build" with a reduced set of
  operators (only those Canary's two ONNX files use) is much smaller and is the first thing to try.

So the **first task is a spike**: build onnxruntime (minimal, Canary's operators) and sherpa-onnx from
pinned sources for arm64 in a `linux/amd64` container with NDK 28.2, time it, check the result runs
Canary on the phone. If it does not fit, the options, in order:

1. The F-Droid build ships without Canary (Vosk only) until it does; Play and GitHub builds use
   sherpa-onnx's published Android libraries. The switch already exists
   (`-Pwambito.nativeFromSource`).
2. Move the precise model to **whisper.cpp + Parakeet TDT 0.6B v3** (ggml, plain C++, no
   dependencies, built like llama.cpp). Parakeet made two more mistakes than Canary in the spike and
   is bigger (416 MB as `ggml-org/parakeet-GGUF` q4_k), but it runs on the same ggml base that Gemma
   would use later, and covers Italian and Portuguese.

## 7. Parser

Canary's text is clean, so the parser is kept. One rule to add, with failing cases first in the
shared quick-capture cases (`packages/core`, both web and phone run them): a units number followed
by a tens number without "con" is one amount in euros and cents ("uno cincuenta" = 1,50 €, "nueve
cincuenta" = 9,50 €), without breaking the cases that already pin two movements. Canary writes
words, not digits, and adds punctuation and capitals ("Dos euros en café."); the shared cases get a
few in that shape.

## 8. A test build to compare Canary and Parakeet

Before Canary is locked in, the founder tries both on their own phone in daily use. A debug-only
build carries a hidden switch (Settings, debug builds only) between Canary and Parakeet TDT 0.6B v3,
both through sherpa-onnx (the spike's exports), and shows under the preview which model wrote the
text and how long it took. It is not shipped. What it decides: whether Parakeet's quality is close
enough for §6.2 to be a real option.

## 9. Later: Gemma reads the text

Not in this work. Gemma 4 E2B (2.84 GB, ~3.5 GB of RAM) is an optional download for phones with
8 GB or more, offered once it also powers the recaps and receipt reading
(`2026-11-05-on-device-ai-design.md`). Measured on the S25 with the screen on, reading Canary's text
with a compact grammar-forced JSON (`{"g":[{"i":cents,"n":name,"c":category}]}`) and five examples:
1.1 s per phrase, 16 of 19 amounts and 18 of 19 categories. Its job then: suggest the category, and
read what the parser leaves unread. The parser keeps the amounts. With the screen off, Android
throttles the CPU ("Dozing") and the same run took 4–13 s; the sheet is always on screen, so that
does not apply in use.

## 10. Open

- A mid-range phone (6 GB) to check Canary's time, its load time and the 3 GB line. None is at hand.
- F-Droid's onnxruntime build (§6).
- Whether F-Droid accepts CC-BY-4.0 weights without the `NonFreeAssets` anti-feature. Its policy
  defers to Debian, which lists CC-BY-4.0 as free; ask on the F-Droid forum before submitting if in
  doubt.
- The exact zip size of the republished Canary model (about 155–190 MB).

## 11. Order of the work

1. F-Droid spike: onnxruntime (minimal) + sherpa-onnx from source, timed (§6).
2. Parser: "uno cincuenta" (§7), its own PR.
3. Debug test build with the Canary/Parakeet switch (§8), for the founder's phone.
4. Kotlin: the recording buffer, the Canary recognizer in a `ModelCache`, the new events (§4.2).
5. Dart: events, the refining state, the 3 s fallback (§4.1, §4.3).
6. Download: `voice-models-v2`, the joint opt-in, the one-time offer, Settings → Voz (§4.4).
7. Licences and About (§5); the F-Droid recipe and `build-native-deps.sh` (§6).

Tests, as everywhere here, come first: Kotlin unit tests for the buffer and the refine (a fake
recognizer, so no native library), Dart tests for the events, the 3 s limit and the sheet's stages,
goldens for the refining state, and the shared parser cases. No recording of a real voice goes into
the repo; fixtures are invented.
