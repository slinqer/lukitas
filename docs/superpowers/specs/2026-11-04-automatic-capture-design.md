# Wambito: automatic capture from bank notifications (v1: Revolut and Google Wallet)

- **Date:** 2026-11-04
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-04.
- **Follows:** Stage 6, "Automatic capture", in `2026-10-20-lukas-design.md` (section 3). This spec
  narrows it to the Android notification listener and two sources.
- **Founder decisions (2026-11-04):**
  1. Sources in v1: the **Revolut app** and **Google Wallet** notifications on Android. Email comes
     later (it would pass through the server). SMS never (Google Play forbids it).
  2. **Everything is parsed on the phone.** Only the parsed result reaches the server, never the
     notification's text.
  3. Captures are saved on the server **as "to review"** and **count** in totals and budgets.
  4. Kinds in v1: **card payments (expense)** and **money in (income)**. Declined payments, moves
     between the person's own Revolut pockets and currency exchanges are ignored. Refunds and sent
     transfers come later.
  5. One **silent** local notification per capture, with **Bien** and **Cambiar**.
  6. The category comes from a **merchant → category memory learned from confirmations**, stored
     on the server. Unknown merchants fall back to **"Otros gastos" / "Otros ingresos"**.
  7. Everything lands in the person's single default account, like any other transaction.
  8. **Everything is free.** No entitlement check. Pricing, if any, is decided after a few months
     of testing with people, in its own spec.
  9. **No log of unrecognized notifications** in v1.

## 1. Goal

When this is done, a card payment with Revolut (in the Revolut app or through Google Wallet) shows
up in Wambito within seconds, with the app closed, as a transaction to review in the right
category when the merchant is known. One tap on the notification confirms it. The same purchase
notified by both apps is saved once.

Out of scope: email, iPhone, other banks (Nequi, Bancolombia, … follow the same parser interface
later), refunds, sent transfers, currency conversion, AI category guesses, multiple accounts,
pricing.

## 2. Android

All new Kotlin code lives in `android/app/src/main/kotlin/com/wambito/app/capture/`.

### 2.1 Enabling it

- **Settings → Captura automática**: one switch per source (Revolut, Google Wallet). The first
  switch shows an explanation screen first: which apps are read, that the text is processed on the
  phone, and what reaches the server (amount, merchant, date, source). This is also the prominent
  disclosure Google Play requires before asking for notification access.
- Then the app opens Android's notification access screen
  (`Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`).
- **Restricted settings.** On Android 13+, an app installed from an APK (the GitHub build) cannot
  get notification access until the person allows "restricted settings" (App info → ⋮ → Allow
  restricted settings). The screen detects a refusal and explains those steps. Play installs are
  not affected.
- Settings shows the state: active, permission missing (with a button to grant it again), or off.
- The service is declared with `android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"`;
  no `uses-permission` changes. `scripts/check-permissions.sh` gets a comment saying so.

### 2.2 The path of one notification

1. **`CaptureListener`** (`NotificationListenerService`) gets the notification. If its package is
   not an enabled source, it returns without reading the text.
2. **`BankParsers`** run the templates for that source on the title and text and return a
   `ParsedCapture` (kind, amount in cents, ISO currency, merchant, posted time, source), or nothing.
   Nothing (promotions, declines, internal moves) means the notification is dropped. One parser per
   source and message format, each a plain Kotlin object behind one interface, so a new bank is a
   new file.
3. The `ParsedCapture`, never the text, goes into a **local queue** on the phone with a generated
   idempotency key.
4. A **WorkManager** job, unique name **`wambito.capture.send`**, constrained to a network, sends
   the queue to `POST /v1/captures`. It reads the session with `widget/SecureSession.kt` and follows
   `notices/NoticeApi.kt` for the HTTP call.
5. With the answer, **`CapturePoster`** posts or updates the notification.

### 2.3 The notification

- Channel **`wambito.capture`**, "Gastos detectados", importance low: no sound, no vibration (the
  bank app already made the phone buzz).
- Text: "Anoté −€12,50 en Mercadona · Supermercado, ¿bien?"; for a new merchant, "… en Otros gastos,
  ¿qué categoría?".
- The notification id comes from the transaction id, so a `merged` answer updates the same
  notification. Several pending ones are grouped in a summary ("3 gastos por revisar").
- **Bien**: a broadcast receiver enqueues the confirmation (same job pattern, idempotent) without
  opening the app, then removes the notification.
- **Cambiar**: opens `wambito://review/<id>`.

### 2.4 Persistent names

Fixed now, since changing them later needs a migration: the WorkManager unique name
`wambito.capture.send` (and `wambito.capture.confirm` for Bien), the queue's storage name
`wambito.capture.queue`, the channel id `wambito.capture`, the listener's class name (Android keeps
the granted access per component).

## 3. Server and data

### 3.1 Database (one migration, RLS on everything new)

- `transactions.needs_review` boolean, not null, default `false`. Separate from `status`
  (`paid` / `pending`, where `pending` means not paid yet). Totals and budgets ignore it, so a
  capture counts.
- `transaction_source` enum gains `capture`.
- `transactions.capture_source` text, null unless `source = capture`: `revolut`, `google_wallet`.
- `categories.system_key` text, null by default; `other` marks the fallback categories. Unique per
  person and kind where not null.
- New table `merchant_categories`: `user_id`, `merchant_key`, `category_id` (cascade on delete),
  timestamps; unique on (`user_id`, `merchant_key`). `merchant_key` is the merchant normalized in
  `packages/core`: lower case, accents removed, trailing store numbers and card-processor prefixes
  removed, spaces collapsed ("MERCADONA 1234" and "Mercadona" are one key).

### 3.2 Fallback categories

"Otros gastos" (expense) and "Otros ingresos" (income), named in the person's language: en "Other
expenses" / "Other income", it "Altre spese" / "Altre entrate", pt "Outras despesas" /
"Outras receitas". Created on the first capture that needs one. If an active category with that
name and kind already exists, it gets `system_key = other` instead of a new one being created.
They are recognized by `system_key`, so renaming them is fine. Archiving one clears its key; the
next capture creates a new one.

### 3.3 `POST /v1/captures`

- Idempotency key required (as for `/v1/transactions/batch`). Body: kind, amount (integer cents),
  currency, merchant, posted time, source. Validated with a zod schema in `packages/core`.
- **Duplicates:** a transaction with `source = capture`, `needs_review = true`, the same kind,
  amount and currency, posted within 10 minutes, is the same purchase. The answer is
  `{ result: "merged", transaction }` and nothing is written.
- Otherwise the category is the `merchant_categories` entry for the merchant key, or the fallback
  of that kind. The transaction is created in the default account with `needs_review = true`,
  `source = capture`, the merchant as its name and the date in the person's time zone. Answer:
  `{ result: "created", transaction }`.
- **Another currency** than the account's: saved with the amount as notified, to review, with the
  original ("50,00 USD") in the note. No conversion in v1.
- In the OpenAPI document, so the web, MCP and mobile generated clients are regenerated.

### 3.4 Reviewing

- `PATCH /v1/transactions/:id` accepts `needsReview: false`. Bien sends only that; Cambiar may also
  change category and amount.
- When a `capture` transaction is confirmed with a category that is not a fallback, its merchant
  key is upserted into `merchant_categories`. The memory learns from what the person confirms,
  never from its own guesses.
- Deleting a capture is an ordinary delete (undo works) and leaves the memory alone.
- `POST /v1/transactions/review` with a list of ids confirms several at once ("Confirmar todos"),
  learning from each.

## 4. Apps

- **Mobile home:** when there are pending captures, a row "3 gastos por revisar" at the top opens
  the inbox.
- **Mobile inbox** (`wambito://review`, `wambito://review/<id>`): the pending list; Bien or tap to
  edit; "Confirmar todos" on top.
- **Mobile and web transaction lists:** a small "por revisar" mark and "de Revolut" on captures.
  The web adds a "Por revisar" filter; confirming and editing work there. The web captures nothing.
- **MCP:** `list_transactions` returns `needsReview`; `update_transaction` accepts it.
- **Copy** in es (template), en, it and pt ARBs and web messages.
- **Privacy policy** (es, en, it, pt): a section on automatic capture: which apps are read, that
  the text stays on the phone, what reaches the server, how to turn it off.

## 5. Errors

- Offline: the capture waits in the queue; nothing is lost.
- Signed out (401): the queue is kept, and one notification says "Inicia sesión para guardar 2
  gastos detectados".
- Server error: WorkManager retries with backoff; the idempotency key prevents duplicates.
- Notification access revoked: Settings shows capture as inactive with a button to grant it again.
- A notification no parser recognizes is dropped silently (decision 9).

## 6. Testing (failing test first)

- **Kotlin (Gradle unit tests):** each parser against invented notifications in the real format
  (amounts, currencies, merchants with accents and numbers, a decline, a promotion, an internal
  move); the queue; the send job with the doubles the notices already use; the notification id
  rule. Real notifications are never committed.
- **API (Vitest + testcontainers):** created vs merged, the 10-minute window, kind and currency in
  the match, merchant memory and learning on confirm, fallback creation and adoption, archived
  fallback, idempotency, RLS on `merchant_categories`.
- **Core:** merchant key normalization, the capture schema.
- **Flutter:** the home row, the inbox, Settings states. **Web:** the mark and the filter.
- **Tooling:** `test/tooling` checks the manifest declares the listener with the bind permission.

## 7. Open before implementation

The founder sends real (redacted) Revolut and Google Wallet notifications, including one purchase
notified by both, to write the two parsers' formats and their fixtures.
