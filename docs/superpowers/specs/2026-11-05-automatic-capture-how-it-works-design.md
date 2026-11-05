# Wambito: "¿Cómo funciona?" for automatic capture (app and landing)

Status: design agreed with the founder on 2026-11-05. Builds on
`docs/superpowers/specs/2026-11-04-automatic-capture-design.md`; lands in the same branch and PR
(`feat/automatic-capture`) before it is merged.

## 1. Goal

Automatic capture is the feature that matters most, and today nothing explains it except a
paragraph and the privacy policy. People should see, step by step and with pictures, what happens
from a bank notification to a confirmed transaction, both in the Android app and on the landing.

- **App:** the steps replace the first-time explainer (shown on the first switch-on of a source,
  which is also Google Play's prominent disclosure) and can be opened again from a "¿Cómo funciona?"
  link in Settings → Captura automática.
- **Landing:** a card "¡Wambi anota los gastos por ti!" in the "Cómo funciona" section, with a
  "Pronto · Solo en Android" badge and a "¿Cómo funciona?" link to a page with the same steps.
- **Same information on both:** the same five steps, the same copy, the same pictures.

## 2. Rules for the copy

- Never mention languages: no "en portugués", no "en todos los idiomas". The copy makes no promise
  about which languages are read. A test enforces it (section 7).
- Describe what leaves the phone, never who can read it on the server: the copy must stay true when
  all data is encrypted end to end. (The privacy policy, which does describe the server, changes on
  that day; so does the merchant → category memory, which lives on the server today.)
- Only Android: iPhone does not let an app read other apps' notifications. The web says the feature
  is only in the Android app.
- Promise only what is built: Revolut and Google Wallet today; "we will add more apps and banks over
  time" is the only forward-looking line.
- Invented examples only (a fixture rule): "Pastelaria Aurora", 12,50 €, "Comida fuera".

## 3. The main picture

The idea in one look: a bank notification becomes a Wambito transaction by itself. Built from UI
pieces (not an image): on top a bank notification card (app icon, "Revolut", the time, the merchant
as title, the amount line with no words: "💳 −12,50 €"), then a round arrow, then a Wambito card
"✓ Anotado en Wambito" holding the transaction row ("Pastelaria Aurora · Otros gastos · por
revisar", −12,50 €). It is the picture of the landing card and the top of the "¿Cómo funciona?"
page and of the app's first step. The founder's reference (a notification card → arrow → "registered"
row) sets the look: dark cards, one accent for the "registered" card, no decoration.

- An income pair (notification "Nómina" "💳 +1.200,00 €" → "Nómina · Otros ingresos") sits beside
  the expense pair only once Revolut's income notifications are read; until then the picture shows
  the expense alone. The two pairs are one component with an `income` switch.
## 4. The five steps (Spanish is the source; en, it, pt-PT translated with the same meaning)

Each step is a Wambi scene on top, then the title and the body, and, where it carries information,
a small demo built from UI pieces under the body.

| # | Title | Body | Scene (`docs/brand/wambi-capture-stepN.webp`) | Demo (built from UI pieces) |
|---|---|---|---|---|
| 1 | Pagas como siempre | Con Revolut o Google Wallet. Tu banco te manda su notificación, como siempre. | Wambi holds a phone, a blank notification above it. | The main picture (section 3). |
| 2 | Wambito la lee en tu teléfono | El texto de la notificación nunca sale de tu teléfono. Solo sale el movimiento: el monto, el comercio, la fecha y la app. | Wambi looks at the phone through a magnifying glass; a padlock on the screen. | Four chips leaving the phone: "12,50 €", "Pastelaria Aurora", "Hoy", "Revolut". |
| 3 | Te avisa y tú decides | Te deja un aviso con Bien y Cambiar. El gasto ya cuenta en tu mes, marcado «por revisar». | Wambi gives a thumbs up beside a card with two buttons. | Wambito's notification as Android shows it: "Anoté −12,50 € en Pastelaria Aurora · Otros gastos, ¿qué categoría?", BIEN and CAMBIAR. |
| 4 | Aprende tus categorías | Cuando le pones categoría a un comercio, la próxima vez ya viene puesta. | Wambi drops a coffee tile into one of three trays; a lightbulb. | Two rows: "Otros gastos · por revisar", then a later day "Comida fuera ✓". |
| 5 | Hoy y lo que viene | Hoy funciona con Revolut y Google Wallet, en la app de Android. Agregaremos más apps y bancos con el tiempo. | Wambi waves; an arc of app tiles, two lit and three with a "+". | None. |

**Scenes (images).** Generated with Codex (`codex exec`, image generation) from the brand art
(`docs/brand/wambi-pointing.webp`) and checked by eye as one set on the night and day backgrounds:
same face, gold, purple limbs and pink sneakers, no text, letters, numbers or logos. Masters are
1024 px WebP with alpha in `docs/brand/wambi-capture-step{1..5}.webp`; the apps ship one 512 px copy
each (`apps/web/public/wambi/capture-step{1..5}.webp`, `apps/mobile/assets/wambi/capture-step{1..5}.webp`),
the same files on both sides. They are decoration (`alt=""`, `aria-hidden`; in Flutter
`excludeFromSemantics`), and Wambi is never drawn over text. A new scene is made the same way and
added to the set only if it stays on-model.

**Demos (code).** Not images: on the web HTML/CSS like the landing's current "Cómo funciona" demos
(`apps/web/app/features/landing/HowItWorks.tsx`), in the app Flutter widgets built from the same
pieces (`TransactionRow`, `PressButton`, tiles, tokens). They follow the theme, read in every
language, and the step's title and body are the accessible content. Under reduced motion nothing
moves.

## 5. App (Flutter, `apps/mobile/lib/capture_auto/`)

- `HowCaptureWorks` (new, `how_capture_works.dart`): an `LkSheet` with a `PageView` of the five
  steps, dots under it, Siguiente on each step but the last. Swiping and the dots both move between
  steps. No new dependency (Flutter's `PageView`).
- `showHowCaptureWorks(context, {required bool askAccess})` returns `Future<bool>`:
  - `askAccess: true` (the first switch-on, replacing `showAutoCaptureExplainer`): the last step
    ends with "Activar acceso" (`key: autoCapture.explainer.confirm`, kept so existing tests and the
    flow stay) and returns true; closing the sheet returns false and the source stays off, as today.
    The prominent disclosure stays complete on the last step: it repeats, under the button, the line
    "Wambito lee las notificaciones de las apps que actives. El texto nunca sale de tu teléfono."
    so it is visible right before the permission, whichever step the person skipped.
  - `askAccess: false` (the new "¿Cómo funciona?" `PressLink` in `AutoCaptureSection`, under the
    lead, `key: autoCapture.how`): the last step ends with "Entendido" and returns false.
- The `AutoCaptureExplained` flag and the order "explain → setSource → openAccess" do not change.
- `auto_capture_explainer.dart` and its ARB strings (`autoCaptureExplainerBody`) go; new ARB keys
  `autoCaptureHow*` in es, en, it, pt (es is the template).

## 6. Landing (web, `apps/web`)

- **Card:** a sixth item in `HowItWorks.tsx`, full width under the 2×2 grid (`is-wide`): title
  "¡Wambi anota los gastos por ti!", body "Lee las notificaciones de Revolut y Google Wallet y anota
  tus gastos para que solo los revises.", badge "Pronto · Solo en Android" (the same badge style as
  the "ways" mobile card), a small picture (step 3's), and a link "¿Cómo funciona?" to the page.
- **Page:** `/automatic-capture` and `/en|it|pt/automatic-capture`, prerendered like the privacy
  pages (`routes.ts`, `react-router.config.ts`, landing-only build included). The five steps one
  under the other, each with its picture, then the "Solo en Android · Pronto" line and a link back
  to the landing. Works without JavaScript. Copy under `landing.capture.*` in the four site
  catalogs; the page reuses `LegalPage`'s header/footer frame, not its typography.
- **Roadmap:** `bank_alerts` (today "later", "Bancolombia, Nequi y más") becomes `building` with the
  copy "Captura automática de tus notificaciones — Revolut y Google Wallet primero; más apps y bancos
  con el tiempo." in the four languages.

## 7. Testing (failing test first)

- Web unit: the capture copy exists in the four catalogs with the five steps; a test fails if any
  capture string (landing card, page, steps) or the app's `autoCaptureHow*` ARB strings name a
  language (a word list per locale: portugués/português/portuguese/portoghese, español/spanish/…,
  inglés/english/…, italiano/italian/…, "idioma(s)", "language(s)", "lingua/lingue", "língua(s)").
- Web e2e (built, no JavaScript): the landing's `#how` has the card with the badge and a link to the
  page in each language; the page shows five step headings; the "ways" mobile card still says Pronto.
- Storybook: `Landing/CaptureCard`, `Capture/HowItWorks` (the page) and one story per picture.
- Flutter widget tests: the first switch-on shows the steps and its last step's "Activar acceso"
  turns the source on and opens access; closing keeps it off; "¿Cómo funciona?" shows the steps and
  ends with "Entendido" without touching the sources; swiping and Siguiente move steps.
- Parity: one pair per step (night, scene + title + body + demo) and one for the main picture, web
  story ↔ Flutter golden, in `parity.json`; differences that the platforms cannot avoid go in
  `knownDifferences`.
- A test checks that the web and mobile copies of each scene are byte-identical, and that each is
  512 px wide with alpha.

## 8. Out of scope (next, in this session)

- Reading notifications in other languages (and the other kinds) comes after this PR is merged,
  from redacted samples the founder collects by switching Revolut's language for a few days at a
  time: Portuguese first, then English, then Spanish. Approach agreed: rules on the phone (per app,
  the same layout in every language plus a short list of verbs per language), no AI model on the
  server (the text would have to leave the phone) or on the phone (Gemini Nano needs Google Play
  services; a bundled model is heavy and can misread amounts).
- iOS: not possible (no access to other apps' notifications).
