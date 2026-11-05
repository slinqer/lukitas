# On-device AI: monthly recap and spending insights

Status: plan, not started. Roadmap item `on_device_ai` (column "later").

## 1. Goal

Wambi tells the person about their month (a "Wrapped"-style recap, short spending insights,
encouraging lines) with a language model that runs **on the phone**. No server, no network once the
model is downloaded, and the spending never leaves the device. It fits the local-first direction.

Out of scope for v1: open-ended chat about finances, financial advice, the web app (no model in the
browser), iPhone.

## 2. The rule: the model writes, the code counts

Small models (0.5B to 4B parameters) add badly, mix up percentages and invent figures with
confidence. In a finance app one invented number breaks trust. So the work has three layers:

1. **Facts, computed deterministically.** A pure function takes a month of transactions and returns
   a small facts object: total spent and earned, top categories with their share, change against the
   previous month, the biggest day, the most frequent merchant, budgets kept or missed, streaks
   (for example days without delivery). Integer cents, as everywhere. It is tested like any other
   domain code and lives where both web and phone can use it: `packages/core` for the API and web,
   a Dart port (or generated fixtures shared by both) for the phone.
2. **Narration, by the model.** The model gets only the facts object, already formatted in the
   person's currency and language, and a prompt that asks for a few short lines in that language.
   It never sees the raw transactions.
3. **Validation.** Every number and amount in the model's output is extracted and must appear in the
   facts object. Any unknown number, a text that is too long or not in the expected language, or a
   blocked phrase (advice such as "invest", blame, debt shaming) means the output is thrown away and
   a template is used instead.

Templates are not only the fallback: **the recap ships first with templates and no model**
(step 1 below). The model adds variety and warmth; it is never required.

## 3. Model choice

Criteria, in order:

1. **Licence compatible with F-Droid**: weights under an OSI licence (Apache 2.0 or MIT), so the
   app carries no `NonFreeAssets` anti-feature. This rules out Gemma 3 and 3n (Gemma Terms of Use)
   and Llama (Llama Community License). Gemma 4 is Apache 2.0 (its Hugging Face model card says so),
   so it qualifies.
2. **Least RAM for the most quality in Spanish**, then English, Italian, Portuguese.
3. **Runs in llama.cpp** (GGUF), quantised to 4 bits.

| Model | Licence | Download (Q4) | RAM in use | Role |
|---|---|---|---|---|
| **Qwen3.5 2B** | Apache 2.0 | ~1.3 GB | ~1.8 GB | **First choice**: best quality per GB with an open licence |
| **Qwen3.5 0.8B** | Apache 2.0 | ~0.5 GB | ~0.8 GB | Phones with 4 GB of RAM |
| Qwen3 1.7B | Apache 2.0 | ~1.1 GB | ~1.5 GB | Fallback if Qwen3.5 is not yet well supported by llama.cpp |
| SmolLM3 3B | Apache 2.0 | ~2 GB | ~2.5 GB | Alternative if Qwen's Spanish disappoints |
| **Gemma 4 E2B** | Apache 2.0 | ~3 GB | ~3 GB | **Rival in the spike**: likely stronger, but 2.3B effective / 5.1B with embeddings, so more RAM in llama.cpp |
| Phi-4-mini 3.8B | MIT | ~2.3 GB | ~3 GB | Better reasoning, weaker Spanish; not needed for narration |
| Gemma 3 / 3n | Gemma ToU | ~0.5–3 GB | 1–3 GB | Excluded: licence (F-Droid anti-feature) |

Sizes are estimates; the spike measures them. **Confirm the licence file of the exact GGUF
artifact** before shipping: the model card's licence governs, not a blog post. Thinking modes
(Qwen) are turned off: narration does not need them and they cost time and battery.

Decided with the founder: **only models with a free (OSI) licence that F-Droid accepts**, and **the
model depends on the phone**. The app reads the device's total RAM and offers one tier:

| Total RAM | What the person gets |
|---|---|
| under ~3 GB | templates only, no download offered |
| ~3–6 GB | Qwen3.5 0.8B |
| ~6–8 GB | Qwen3.5 2B |
| ~8 GB or more | Gemma 4 E2B if it wins the spike, otherwise Qwen3.5 2B |

The thresholds are set from the spike's measured RAM peaks, not these guesses. The person can
always pick a smaller tier (less storage, less battery) and delete the model; never a larger one
than the phone supports. A model outside the free-licence rule never enters this table.

## 4. Runtime

- **llama.cpp** through a Flutter binding (`llama_cpp_dart`, `fllama` or a thin FFI of our own),
  CPU first, GPU (Vulkan/OpenCL) later if measured worthwhile. Open source, no Google Play services,
  so it passes the mobile CI's no-Google check and F-Droid's build-from-source.
- Not Gemini Nano / AICore (needs Google services, few devices). LiteRT-LM is tuned for Gemma and
  keeps Gemma 4's per-layer embeddings out of fast memory; if Gemma 4 wins the spike, check whether
  LiteRT-LM builds from source without Google services before choosing it over llama.cpp.
- Generation runs in a WorkManager job (for example on the 1st of the month, while charging), and
  the result is stored, so opening the recap is instant. A unique work name is a persistent name on
  phones: choose it once (`wambito.recap.monthly`).

## 5. Distribution of the model

- **Never inside the APK.** An opt-in download from the recap screen ("Turn on Wambi's private AI,
  1.3 GB, Wi-Fi only"), stored in the app's private storage, removable from settings.
- Served from our own host (the R2 bucket or a GitHub release), pinned by version and verified by
  SHA-256 before loading. No third-party download at runtime, so no `NonFreeNet` anti-feature.
- The F-Droid, Play and GitHub builds share the same code and the same model URL.

## 6. Free or paid

Open question, to decide before the model step ships (step 4):

- **Start free** for the founder and early users: it is how we learn whether the texts are good.
- The agreed business model says Plus is only for features with a real per-user cost (AI capture,
  WhatsApp, bank connections, server transcription). On-device AI costs us almost nothing per user
  (only the model download bandwidth), so charging for it contradicts that rule unless the rule
  changes.
- If it becomes paid, the honest options are: (a) part of "Wambito Plus" sold through Slinqer
  S.A.S. on Play, with the F-Droid build unlocking it for supporters (donors), since the code is
  open and anyone can rebuild it without the check; or (b) free everywhere, and the recap becomes a
  reason to donate ("Wambi wrote this on your phone; help keep it free").
- Recommendation for now: free during the test phase, decide with usage data. The roadmap copy
  promises no price either way.

## 7. Steps

1. **Facts.** The monthly facts function, tested with invented fixtures (cents, every currency the
   app supports, empty month, month with only income).
2. **Recap with templates.** The recap screen on the phone (and on the web) with template texts per
   language. Useful on every phone, no model.
3. **Spike on a real phone.** llama.cpp + Qwen3.5 2B, Qwen3.5 0.8B and Gemma 4 E2B on a high-end
   and a 4 GB phone:
   measure load time, tokens per second, RAM peak, battery, and judge 30 generated recaps per
   language against the validator. Exit criteria: under 20 s per recap on a mid-range phone, and
   at most 1 in 10 outputs rejected by the validator.
4. **Model behind a switch.** Opt-in download, background generation, validator with template
   fallback, delete-model setting. Decide free or paid (section 6) before this ships.
5. **More insights.** "Why did I spend more?" explanations (the code finds the cause, the model
   words it), encouraging lines after a kept budget.

## 8. Risks

- Spanish quality of the smaller model: measured in the spike; SmolLM3 is the alternative.
- Low-end phones: templates must be good enough on their own.
- Tone: no advice, no guilt. The validator's blocked phrases and a fixed prompt keep it in line.
- Model churn: a newer open model may appear before step 4; the criteria in section 3 decide, not
  this table.
