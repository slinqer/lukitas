# Automatic capture "¿Cómo funciona?" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explain automatic capture step by step, with pictures, in the Android app (replacing the first-time explainer, and from a "¿Cómo funciona?" link) and on the landing (a card in "Cómo funciona" and a prerendered page), with the same five steps on both.

**Architecture:** Each step is a Wambi scene (a shared WebP, the same file in both apps), a title, a body and, for steps 1–4, a small demo built from UI pieces (HTML/CSS on the web, Flutter widgets in the app). Copy lives in the web site catalogs (`landing.capture.*`) and the ARBs (`autoCaptureHow*`); parity pairs keep the two sides alike.

**Tech Stack:** React Router 8 (prerendered public pages), use-intl, Storybook + Vitest; Flutter (Riverpod 3, `PageView`, `LkSheet`), ARB l10n, parity goldens.

**Spec:** `docs/superpowers/specs/2026-11-05-automatic-capture-how-it-works-design.md`

## Global Constraints

- Never name a language in any capture copy (web card, page, steps, ARB `autoCaptureHow*`): no "portugués / português / portuguese / portoghese", "español / spanish / espanhol / spagnolo", "inglés / english / inglês / inglese", "italiano / italian", "idioma(s) / language(s) / lingua / lingue / língua(s)".
- Copy says what leaves the phone, never who reads it on the server.
- Only Android. Web badge: "Pronto · Solo en Android" (es); the "ways" mobile card keeps "Pronto".
- Forward-looking line only: "Agregaremos más apps y bancos con el tiempo."
- Invented examples only: "Pastelaria Aurora", 12,50 € (1250 cents, EUR), "Comida fuera"; income pair "Nómina", +1.200,00 € stays hidden (`income` off) in this plan.
- Scenes: masters `docs/brand/wambi-capture-step{1..5}.webp` (1024 px); shipped copies 512 px wide with alpha, byte-identical in `apps/web/public/wambi/capture-step{1..5}.webp` and `apps/mobile/assets/wambi/capture-step{1..5}.webp`; decoration only (`alt=""` + `aria-hidden`, Flutter `excludeFromSemantics: true`), never over text.
- Step keys, in order: `pay`, `reads`, `decide`, `learns`, `next`.
- Copy in four languages (es source, en, it, pt as in Portugal); web `messages.test.ts` and `arb_parity_test.dart` rules hold. Spanish texts are the spec's (section 4) verbatim.
- Wambito's notification in the demo uses the same words as `CaptureText` (strings `capture_*`) for that language.
- Generated files are regenerated, never hand-edited; no new dependency on either side.
- Commits: Conventional Commits, lowercase sentence, stage by path, no `Co-Authored-By` line.

## Review Focus

1. The first switch-on, closed without "Activar acceso" (back, drag down, tap outside): the source stays off and the flag stays unset, so the steps show again next time. → Task 6 test `closing the steps keeps the source off`.
2. A person on the last step who never saw step 2 still sees the disclosure line right above "Activar acceso". → Task 6 test `the last step carries the disclosure`.
3. The landing built without JavaScript: the card's link is a real `<a href>` to the localized page, and the page renders all five steps. → Task 4 e2e `capture page works without javascript`.
4. Reduced motion: the pager and the web page move nothing (no slide, no count-up). → Task 6 test `reduced motion jumps between steps`; Task 3 story under `prefers-reduced-motion`.
5. A narrow phone (320 px web, 360 dp app): the main picture's cards wrap text and nothing overflows. → Task 4 e2e `nothing overflows at 320px`; Task 6 test at `Size(360, 740)` with no overflow error.

---

### Task 1: The scenes, shipped to both apps

**Files:**
- Create: `apps/web/public/wambi/capture-step{1..5}.webp`, `apps/mobile/assets/wambi/capture-step{1..5}.webp` (512 px copies of the masters: `magick docs/brand/wambi-capture-stepN.webp -resize 512x512 -quality 90 -define webp:alpha-quality=100 <dest>`; copy the web file to mobile so both are byte-identical)
- Modify: `apps/mobile/pubspec.yaml:62-64` (declare the five assets)
- Test: `apps/mobile/test/tooling/capture_scenes_test.dart`

**Interfaces:**
- Produces: web URL `/wambi/capture-stepN.webp`; Flutter asset `assets/wambi/capture-stepN.webp` (N = 1..5, step order `pay`…`next`).

- [ ] **Step 1: Write the failing test** `capture_scenes_test.dart` (reads files like the other `test/tooling` tests):
  - `for n in 1..5`: `File('assets/wambi/capture-step$n.webp').readAsBytesSync()` equals `File('../web/public/wambi/capture-step$n.webp').readAsBytesSync()`.
  - Each is a VP8X WebP with alpha and 512 px wide: bytes 0–3 `RIFF`, 8–15 `WEBPVP8X`, `bytes[20] & 0x10 != 0`, `1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16) == 512`.
  - `pubspec.yaml` lists `assets/wambi/capture-step$n.webp`.
- [ ] **Step 2: Run** `flutter test test/tooling/capture_scenes_test.dart` (in `apps/mobile`) — FAIL (files missing).
- [ ] **Step 3: Make the copies and declare the assets.**
- [ ] **Step 4: Run** the test — PASS.
- [ ] **Step 5: Commit** `feat(mobile): ship the capture scenes to both apps` (stage the ten files, pubspec, the test).

### Task 2: Web copy, roadmap fix, and the no-language rule

**Files:**
- Modify: `apps/web/app/i18n/messages/{es,en,it,pt}.json` (new `landing.capture`; `roadmap.items.bank_alerts`), `apps/web/app/features/roadmap/roadmap.ts:54` (`"later"` → `"building"`)
- Test: `apps/web/app/i18n/messages.test.ts` (new cases), roadmap test if one pins statuses

**Interfaces:**
- Produces keys under `landing.capture`:
  - `card.title` "¡Wambi anota los gastos por ti!", `card.body` "Lee las notificaciones de Revolut y Google Wallet y anota tus gastos para que solo los revises.", `card.badge` "Pronto · Solo en Android", `card.link` "¿Cómo funciona?"
  - `page.title` "¿Cómo funciona la captura automática?", `page.lead` (one sentence: the bank notification becomes a Wambito transaction by itself), `page.soon` "Pronto en la app de Android.", `page.back` "Volver al inicio", `page.meta.title`, `page.meta.description`
  - `steps.{pay,reads,decide,learns,next}.{title,body}` — the spec's section 4 texts
  - `demo.registered` "Anotado en Wambito", `demo.review` "por revisar", `demo.today` "Hoy", `demo.notice` "Anoté {amount} en {merchant} · {category}, ¿qué categoría?" (en/it/pt: the `CaptureText` words), `demo.ok` "Bien", `demo.change` "Cambiar", `demo.other_expenses` (= `FALLBACK_CATEGORY_NAMES[locale].expense`), `demo.eating_out` "Comida fuera"
- `roadmap.items.bank_alerts.title` "Captura automática de tus notificaciones", `.body` "Revolut y Google Wallet primero; más apps y bancos con el tiempo."

- [ ] **Step 1: Write the failing tests** in `messages.test.ts`:
  - `capture copy has every step in every language`: for each locale, `landing.capture.steps` keys equal `["pay","reads","decide","learns","next"]`, each title and body non-empty.
  - `capture copy names no language`: every string under `landing.capture` and `roadmap.items.bank_alerts`, lowercased, matches none of the Global Constraints words (one regex per word, `\b` bounded).
  - `capture copy says Android, Revolut and Google Wallet`: `card.badge` contains "Android"; `card.body` contains "Revolut" and "Google Wallet"; `steps.next.body` contains both.
- [ ] **Step 2: Run** `pnpm vitest run --project "@wambito/web (unit)" apps/web/app/i18n` — FAIL.
- [ ] **Step 3: Write the copy** in the four catalogs and change `bank_alerts`'s status.
- [ ] **Step 4: Run** the web unit project — PASS (parity, ICU, PT-PT rules included).
- [ ] **Step 5: Commit** `feat(web): copy for automatic capture's how it works`.

### Task 3: Web steps and demos (components + stories)

**Files:**
- Create: `apps/web/app/features/capture/CaptureSteps.tsx`, `CaptureDemos.tsx`, `capture.css`, `CaptureSteps.stories.tsx`
- Test: the stories' `play` functions (Storybook project)

**Interfaces:**
- Consumes: Task 1 URLs, Task 2 keys.
- Produces:
  - `CAPTURE_STEPS = ["pay","reads","decide","learns","next"] as const` and `type CaptureStep`.
  - `MainPicture({ income = false }: { income?: boolean })` — notification card ("Revolut", time "17:06", title "Pastelaria Aurora", line "💳 −12,50 €") → round arrow → card "✓ {demo.registered}" with a transaction row (name, `demo.other_expenses`, the `demo.review` mark, −12,50 €). With `income`, a second pair "Nómina" +1.200,00 € → "Nómina · Otros ingresos".
  - `ChipsDemo()` (step 2: "12,50 €", "Pastelaria Aurora", `demo.today`, "Revolut"), `NoticeDemo()` (step 3: Android-style notification with `demo.notice` formatted with the money formatter, buttons `demo.ok` / `demo.change`), `LearnDemo()` (step 4: two rows, the second with `demo.eating_out` and a check).
  - `CaptureStepView({ step }: { step: CaptureStep })` — scene `<img src="/wambi/capture-stepN.webp" alt="" aria-hidden width=256 height=256 loading="lazy">`, `<h2>` title, `<p>` body, then the step's demo (`pay` → `MainPicture`, `reads` → `ChipsDemo`, `decide` → `NoticeDemo`, `learns` → `LearnDemo`, `next` → none).
  - `CaptureSteps()` — the five `CaptureStepView`s in an `<ol>`.
- Amounts through the existing money formatter (`apps/web/app/money/…`, as `HowItWorks.tsx`'s `DEMO` does), never hard-coded strings; pieces reuse `lk-landing-card`, `lk-row`, `lk-tile`, tokens. Reduced motion: no transitions.

- [ ] **Step 1: Write the stories with failing `play`s**: `Capture/Steps` (night): five `heading` level 2 with the five Spanish titles; five `img` with `alt=""`; text "Anotado en Wambito" and "por revisar" present. `Capture/MainPicture` (night) and `Capture/MainPicture/Income` (with `income`, shows "Nómina"). One story per step `Capture/Step/{pay,reads,decide,learns,next}` (night) for parity.
- [ ] **Step 2: Run** `pnpm vitest run --project "@wambito/web (storybook)" apps/web/app/features/capture` — FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** — PASS; also `pnpm --filter @wambito/web typecheck`.
- [ ] **Step 5: Commit** `feat(web): the steps and demos of automatic capture`.

### Task 4: The landing card and the page

**Files:**
- Create: `apps/web/app/features/capture/CapturePage.tsx`, `apps/web/app/routes/{automatic-capture,en.automatic-capture,it.automatic-capture,pt.automatic-capture}.tsx`
- Modify: `apps/web/app/site/paths.ts` (`AUTOMATIC_CAPTURE_PATH`, `SitePage` += `"automaticCapture"`, `SITE_PAGES`, `PAGE_PATH`), `apps/web/app/routes.ts`, `apps/web/app/features/landing/seo.ts:98` (meta key `landing.capture.page.meta`), `apps/web/app/features/landing/HowItWorks.tsx` (the wide card), `landing.css` (`is-wide`), `apps/web/e2e/landing.spec.ts`, `apps/web/e2e/landing-only.spec.ts` (prerendered folders list ~619-636)
- Test: `seo.test.ts` (new page in sitemap/hreflang), e2e

**Interfaces:**
- Consumes: Task 3 `CaptureSteps`, `MainPicture`; Task 2 keys.
- Produces: `AUTOMATIC_CAPTURE_PATH: Record<Locale,string>` = `/automatic-capture`, `/en/automatic-capture`, `/it/automatic-capture`, `/pt/automatic-capture`.
- Card: a fifth `<li className="lk-landing-card is-wide">` after the four steps in `#how`: `MainPicture` (`aria-hidden` container), `<h3>{card.title}</h3>`, `<p>{card.body}</p>`, `<span className="lk-landing-soon">{card.badge}</span>`, `<Link to={AUTOMATIC_CAPTURE_PATH[locale]}>{card.link}</Link>` (a real `<a>`).
- Page: `SiteHeader`, `<h1>{page.title}</h1>`, lead, `CaptureSteps`, `page.soon`, link to `LANDING_PATH[locale]`, `Footer`; prerendered per locale like `privacy`.

- [ ] **Step 1: Write the failing tests**:
  - `seo.test.ts`: `automaticCapture` has a page in each locale with hreflang alternates and is in the sitemap.
  - `landing.spec.ts` per locale: `#how` holds the card text `card.title`, the badge, and a link whose `href` is the locale's page; `capture page works without javascript` (built suite, JS off): five `h2`, five scene images, the soon line; `nothing overflows at 320px` on the page and on `#how`; the "ways" mobile card still shows Pronto.
  - `landing-only.spec.ts`: `automatic-capture/index.html` exists per locale in the landing-only build.
- [ ] **Step 2: Run** `pnpm vitest run --project "@wambito/web (unit)" apps/web/app/features/landing/seo.test.ts` — FAIL; e2e later.
- [ ] **Step 3: Implement** paths, routes, page, card, CSS.
- [ ] **Step 4: Run** web unit + storybook projects, `pnpm --filter @wambito/web typecheck`, then the root stack with `E2E_NOW=2026-10-21T15:00:00Z` and `pnpm --filter @wambito/web e2e:landing` and `e2e:landing-only` — PASS. `docker compose stop` after.
- [ ] **Step 5: Commit** `feat(web): automatic capture on the landing and its how it works page`.

### Task 5: App copy and the no-language rule

**Files:**
- Modify: `apps/mobile/lib/l10n/app_{es,en,it,pt}.arb` (add keys; remove `autoCaptureExplainerBody`)
- Test: `apps/mobile/test/l10n/capture_copy_test.dart`

**Interfaces:**
- Produces ARB keys: `autoCaptureHowLink` "¿Cómo funciona?", `autoCaptureHowNext` "Siguiente", `autoCaptureHowDone` "Entendido", `autoCaptureHowDisclosure` "Wambito lee las notificaciones de las apps que actives. El texto nunca sale de tu teléfono.", `autoCaptureHow{Pay,Reads,Decide,Learns,Next}{Title,Body}` (the spec's texts), `autoCaptureHowRegistered`, `autoCaptureHowReview`, `autoCaptureHowToday`, `autoCaptureHowNotice` (`{amount}`, `{merchant}`, `{category}`; same words as the web `demo.notice`), `autoCaptureHowOk`, `autoCaptureHowChange`, `autoCaptureHowOtherExpenses`, `autoCaptureHowEatingOut`. "Activar acceso" stays `autoCaptureExplainerConfirm`.

- [ ] **Step 1: Write the failing test** `capture_copy_test.dart`: parse the four ARBs; every key starting `autoCaptureHow` exists in all four; none of their values matches the Global Constraints language words; `autoCaptureHowNextBody` contains "Revolut", "Google Wallet" and "Android"; the Spanish values equal the web `landing.capture.steps.*` Spanish values (read `../web/app/i18n/messages/es.json`) for the five titles and bodies.
- [ ] **Step 2: Run** `flutter test test/l10n` — FAIL.
- [ ] **Step 3: Add the keys**, remove `autoCaptureExplainerBody`, `flutter pub get` (regenerates l10n).
- [ ] **Step 4: Run** `flutter test test/l10n` and `flutter analyze` — PASS (analyze fails only on the explainer's use of the removed key, fixed in Task 6; if so, keep the key until Task 6 and remove it there).
- [ ] **Step 5: Commit** `feat(mobile): copy for automatic capture's how it works`.

### Task 6: The app's steps sheet

**Files:**
- Create: `apps/mobile/lib/capture_auto/how_capture_works.dart`, `apps/mobile/lib/capture_auto/capture_demos.dart`
- Delete: `apps/mobile/lib/capture_auto/auto_capture_explainer.dart`
- Modify: `apps/mobile/lib/capture_auto/auto_capture_section.dart` (`_toggle` uses `showHowCaptureWorks(context, askAccess: true)`; a `PressLink` `autoCaptureHowLink`, key `autoCapture.how`, under the lead, calls it with `askAccess: false`)
- Test: `apps/mobile/test/capture_auto/how_capture_works_test.dart`, update `auto_capture_section_test.dart`

**Interfaces:**
- Consumes: Task 1 assets, Task 5 keys.
- Produces:
  - `enum CaptureHowStep { pay, reads, decide, learns, next }`.
  - `Future<bool> showHowCaptureWorks(BuildContext context, {required bool askAccess})` — `LkSheet.show<bool>` with `HowCaptureWorks(askAccess:)`; returns `go ?? false`.
  - `class HowCaptureWorks extends StatefulWidget` — `PageView` of `CaptureHowStepView`s, dots (key `autoCapture.how.dot.<i>`), `Siguiente` (key `autoCapture.how.next`) on steps 0–3; on the last step `autoCaptureHowDisclosure` above the final button: `askAccess` → `autoCaptureExplainerConfirm` (key `autoCapture.explainer.confirm`, pops true), else `autoCaptureHowDone` (key `autoCapture.how.done`, pops false). Under `MediaQuery.disableAnimations`, `jumpToPage` instead of `animateToPage`.
  - `CaptureHowStepView({required CaptureHowStep step})` — `Image.asset('assets/wambi/capture-stepN.webp', width: 200, excludeFromSemantics: true)`, title, body, demo.
  - `MainPicture({bool income = false})`, `ChipsDemo()`, `NoticeDemo()`, `LearnDemo()` in `capture_demos.dart`, same content as Task 3, built from `TransactionRow`, `PressButton`, tiles, tokens; amounts through `lib/money/format.dart`.

- [ ] **Step 1: Write the failing tests** (`how_capture_works_test.dart`, `pumpSettingsApp` with the capture fakes):
  - `first switch-on shows the steps and Activar acceso turns the source on`: tap `autoCapture.revolut`; `HowCaptureWorks` found; tap `autoCapture.how.next` ×4; tap `autoCapture.explainer.confirm`; fake platform got `setSource('revolut', true)` and `openAccessSettings`.
  - `closing the steps keeps the source off`: switch on, then `Navigator.pop` / back; `setSource` not called; flag unset; switching on again shows the steps again.
  - `the last step carries the disclosure`: swipe to the last page; `autoCaptureHowDisclosure` text visible together with `autoCapture.explainer.confirm`.
  - `Cómo funciona shows the steps and ends with Entendido`: tap `autoCapture.how`; go to the last step; `autoCapture.how.done` present, `autoCapture.explainer.confirm` absent; tapping it closes the sheet; no `setSource` call.
  - `swiping and Siguiente move steps`: a fling left shows step 2's title; `autoCapture.how.dot.2` selected after one more `next`.
  - `reduced motion jumps between steps`: with `MediaQueryData(disableAnimations: true)`, one `next` and `pump()` (no settle) shows step 2.
  - `fits a 360 dp phone`: `tester.view.physicalSize = Size(360, 740) * dpr`; every step pumps with no overflow error.
- [ ] **Step 2: Run** `flutter test test/capture_auto` — FAIL.
- [ ] **Step 3: Implement** the sheet, demos, section changes; delete the old explainer (and `autoCaptureExplainerBody` if Task 5 kept it).
- [ ] **Step 4: Run** `flutter test test/capture_auto test/settings` and `flutter analyze` — PASS.
- [ ] **Step 5: Commit** `feat(mobile): explain automatic capture step by step`.

### Task 7: Parity pairs

**Files:**
- Create: `apps/mobile/test/parity/capture_how_parity_test.dart`
- Modify: `apps/mobile/test/parity/parity.json` (entries `capture-step-{pay,reads,decide,learns,next}` → stories `capture-step--{pay,…}` and `capture-main-picture` → `capture-mainpicture--…`, night), web shots via `pnpm --filter @wambito/web parity:shots <id>`
- Test: the parity test itself

**Interfaces:**
- Consumes: Task 3 stories, Task 6 widgets (`CaptureHowStepView`, `MainPicture`) inside `ParityStoryFrame`.

- [ ] **Step 1: Write** the parity test with `parityGolden(t, id, widget, theme: night)` for the six ids, and the six `parity.json` entries.
- [ ] **Step 2: Run** `pnpm --filter @wambito/web parity:shots` for the six ids, then `flutter test test/parity/capture_how_parity_test.dart` — FAIL until the goldens exist / ink is under 2%.
- [ ] **Step 3: Fix** layout differences on either side until each pair passes; only unavoidable ones (emoji raster, font hinting) go in `knownDifferences`. `flutter test --update-goldens test/parity/capture_how_parity_test.dart`, then `dart run tool/parity/compose.dart --max 2 capture-step-pay` (and the rest) to check by eye.
- [ ] **Step 4: Run** the parity test — PASS.
- [ ] **Step 5: Commit** `test(mobile): parity for automatic capture's how it works`.

### Task 8: Maps

**Files:**
- Modify: `apps/web/AGENTS.md` (the page `/automatic-capture`, `features/capture/`, keys `landing.capture.*`), `apps/mobile/AGENTS.md` (`how_capture_works.dart` replaces the explainer; it is the Play prominent disclosure; assets `capture-step*`), `docs/AGENTS.md` (`docs/brand/wambi-capture-step*` are Codex-generated scenes from `wambi-pointing.webp`, how to make another, the shipped 512 px copies)

- [ ] **Step 1: Write** the three map updates.
- [ ] **Step 2: Run** `scripts/check-old-name.sh` and lint (`pnpm lint`; in this worktree, biome with a config copy that drops the `!**/.claude` ignore, tracked files only) — PASS.
- [ ] **Step 3: Commit** `docs: maps for automatic capture's how it works`.

### Final check

- [ ] Root: `pnpm lint && pnpm typecheck && pnpm test`; web e2e (`e2e`, `e2e:landing`, `e2e:landing-only`, `e2e:landing-only-app`) with the pinned clock; mobile: `flutter analyze`, `flutter test --exclude-tags golden`, the parity test, gradle unit tests.
- [ ] On the emulator (debug build, dev stack): switch on Revolut for the first time, walk the five steps, Activar acceso; then "¿Cómo funciona?" ends with Entendido. Screenshots to the founder.
