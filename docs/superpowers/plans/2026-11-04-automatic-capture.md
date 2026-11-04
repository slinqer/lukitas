# Automatic capture (Revolut and Google Wallet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Card payments and money in notified by the Revolut app or Google Wallet on Android become
"to review" transactions in Wambito within seconds, with the app closed, confirmed with one tap.

**Architecture:** A Kotlin `NotificationListenerService` parses notifications of enabled sources on
the phone and queues only the parsed result; a WorkManager job sends it to a new
`POST /v1/captures`, which de-duplicates, picks the category from a learned merchant memory (or a
fallback "Otros"), and saves the transaction with `needs_review = true`. A silent local
notification offers Bien / Cambiar; the app, web and MCP show and confirm pending ones.

**Tech Stack:** Kotlin (WorkManager, HttpURLConnection, org.json), Flutter + Riverpod 3, Hono +
zod OpenAPI, Drizzle + Postgres RLS, React Router, Vitest + testcontainers, Gradle unit tests.

**Spec:** `docs/superpowers/specs/2026-11-04-automatic-capture-design.md`

## Global Constraints

- Money is integer cents; stored amounts are signed, negative for expenses (as everywhere).
- The notification's text never leaves the phone and is never stored, queued or logged; only
  `ParsedCapture` fields are.
- Fixtures are invented in the real format; never commit a real notification.
- Sources: `revolut`, `google_wallet`. Kinds: `expense`, `income`.
- Duplicate window: 10 minutes on `captured_at`, same kind, amount and currency, any `source = capture` row (confirmed or not).
- Fallback categories, `system_key = 'other'`: es "Otros gastos" / "Otros ingresos", en "Other
  expenses" / "Other income", it "Altre spese" / "Altre entrate", pt "Outras despesas" /
  "Outras receitas".
- Persistent names (fixed, never renamed): WorkManager `wambito.capture.send`,
  `wambito.capture.confirm`; queue prefs file `wambito.capture.queue`; enabled-sources prefs
  `wambito.capture.sources`; channel id `wambito.capture`; listener class
  `com.wambito.app.capture.CaptureListener`.
- No Google Play Services, no new HTTP library, no new `uses-permission`.
- Everything free: no entitlement check.
- Copy in es (template), en, it, pt. Repo content in English.
- Generated files regenerated, never hand-edited (root `AGENTS.md`).
- Commits: `feat(area): …` lowercase, stage by path, no `Co-Authored-By` line.

## Review Focus

- A purchase notified by both apps where the second arrives after the first was already
  confirmed with Bien. Expected: still one transaction. The match therefore covers confirmed
  captures too (spec §3.3; Task 3 test `merges into a confirmed capture`).
- A notification near midnight in the person's zone: the date comes from `capturedAt` in the
  profile's zone, not UTC (Task 3 test `dates by the profile zone`).
- The same queued capture sent twice after a crash mid-request: idempotency returns the first
  answer, and the phone posts one notification (Task 3 `retry returns the first answer`, Task 7
  `resend after crash keeps one item`).
- Signed out with captures queued: nothing is dropped, one sign-in notice (Task 7
  `unauthorized keeps the queue`).
- Merchant names with accents, case and store numbers ("MERCADONA 1234", "Mercadona") share one
  memory entry (Task 1 `merchantKey` cases).

---

### Task 1: Core: capture schema, merchant key, review fields

**Files:**
- Create: `packages/core/src/capture.ts`, `packages/core/src/capture.test.ts`
- Modify: `packages/core/src/schemas.ts` (`transactionDto`, `updateTransactionSchema`), `packages/core/src/index.ts`

**Interfaces:**
- Produces:
  - `CAPTURE_SOURCES = ["revolut", "google_wallet"] as const`; `type CaptureSource`.
  - `createCaptureSchema`: `{ kind: "expense"|"income", amount: positive int cents, currency: SupportedCurrency | 3-letter uppercase string, merchant: string trim 1..120, capturedAt: ISO instant string, source: CaptureSource }`; `type CreateCapture`.
  - `captureResultDto`: `{ result: "created"|"merged", transaction: transactionDto, category: { name: string, fallback: boolean } }` (the phone's notification text needs the category name).
  - `merchantKey(merchant: string): string`.
  - `FALLBACK_CATEGORY_NAMES: Record<"es"|"en"|"it"|"pt", { expense: string; income: string }>` (values in Global Constraints).
  - `reviewTransactionsSchema`: `{ ids: uuid[] 1..50 }`.
  - `transactionDto` gains `needsReview: boolean`, `captureSource: CaptureSource | null`; `source` enum gains `"capture"`.
  - `updateTransactionSchema` gains `needsReview: z.literal(false)` (only confirming).

- [ ] **Step 1: Write the failing tests** in `capture.test.ts`:
  - `merchantKey`: `"MERCADONA 1234"` and `"Mercadona"` → `"mercadona"`; `"Café  Central"` → `"cafe central"`; `"UBER *TRIP"` → `"uber trip"`; `"Lidl 0042 Madrid"` → `"lidl madrid"`; `""` after trim throws.
  - `createCaptureSchema` rejects amount `0`, `-5`, `1.5`; rejects source `"sms"`; accepts a valid body.
  - `updateTransactionSchema.parse({ needsReview: true })` throws; `{ needsReview: false }` passes.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/core` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `capture.ts` and the schema changes. `merchantKey`: NFD + strip marks, lowercase, replace non-alphanumerics with space, drop tokens that are only digits, collapse spaces, trim.
- [ ] **Step 4: Run** the same command — Expected: PASS. Also `pnpm typecheck` (API/web will fail on the new DTO fields until Task 3; fix `toTransactionDto` in Task 2 instead, so run typecheck for core only: `pnpm --filter @wambito/core typecheck`).
- [ ] **Step 5: Commit** `feat(core): the capture schema, merchant key and review fields`.

### Task 2: Database: migration and RLS

**Files:**
- Modify: `packages/db/src/schema/domain.ts`
- Create: `packages/db/drizzle/0008_automatic_capture.sql` (via `pnpm --filter @wambito/db generate`, then append RLS), `drizzle/meta` updates
- Modify: `apps/api/src/services/transactions.ts` (`toTransactionDto` maps the new fields)
- Test: `packages/db/test/` RLS test file that already covers tenant isolation (add a case), or `packages/db/src/*.test.ts` where the RLS tests live

**Interfaces:**
- Produces (Drizzle): `transactions.needsReview` (boolean not null default false), `transactions.captureSource` (text null), `transactions.capturedAt` (timestamptz null), enum value `capture` in `transaction_source`, `categories.systemKey` (text null) with unique index `categories_system_key` on (`user_id`, `kind`, `system_key`) where `system_key is not null and archived_at is null`, table `merchantCategories` (`id`, `userId`, `merchantKey`, `categoryId` → categories cascade, timestamps) with unique `merchant_categories_key` on (`user_id`, `merchant_key`), index `transactions_user_capture` on (`user_id`, `captured_at`) where `source = 'capture'`.

- [ ] **Step 1: Write the failing test:** as user A insert a `merchant_categories` row; as user B `select` returns none and an insert with A's `user_id` fails the policy.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/db` — Expected: FAIL (table missing).
- [ ] **Step 3: Implement** the schema, generate the migration, append `ENABLE`/`FORCE ROW LEVEL SECURITY` and the `tenant_isolation` policy for `merchant_categories` in the same form as `0001_rls.sql`. Grants come from the bootstrap's default privileges; nothing to add. Map `needsReview`, `captureSource` in `toTransactionDto`.
- [ ] **Step 4: Run** the db tests and `pnpm typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): captures, review flag and the merchant category memory`.

### Task 3: API: `POST /v1/captures`

**Files:**
- Create: `apps/api/src/routes/captures.ts`, `apps/api/src/services/captures.ts`, `apps/api/test/captures.test.ts`
- Modify: `apps/api/src/app.ts` (register `captureRoutes`), `apps/api/src/http/schemas.ts` (`CreateCapture`, `CaptureResult` with `.meta({ id })`)

**Interfaces:**
- Consumes: Task 1 schemas, Task 2 columns, `defaultAccount(tx, { lock: true })`, `withUser`, `idempotent(deps.db, { required: true })`, `todayIn`-style zone conversion from `services/time.ts`.
- Produces: `POST /v1/captures`, operationId `createCapture`, `201` `CaptureResult` for created, `200` for merged; `fallbackCategory(tx, userId, kind, locale): Promise<string>` in `services/captures.ts` (Task 4 uses `isFallback(categoryId)` via `system_key`).

- [ ] **Step 1: Write the failing tests** in `captures.test.ts` (harness `createTestApp`, two users):
  - `creates a capture to review`: expense 1250 EUR "Mercadona" → 201, `result: "created"`, `amount: -1250`, `needsReview: true`, `source: "capture"`, `captureSource: "revolut"`, category named "Otros gastos".
  - `income lands in Otros ingresos` with `amount > 0`.
  - `merges within 10 minutes`: same body from `google_wallet` 9 min later → 200 `merged`, same id; list has one row.
  - `does not merge after 10 minutes`, `does not merge across kind`, `does not merge across amount`.
  - `merges into a confirmed capture` (Review Focus 1): confirm the first, send the second within 10 min → `merged`.
  - `never merges with a hand-typed transaction` (`source: "app"`, same amount, same day).
  - `uses the merchant memory`: seed `merchant_categories` for "mercadona" → category is that one.
  - `adopts an existing Otros gastos` (created by hand) instead of a second one; `creates a new fallback after archiving it`.
  - `names the fallback in the profile language` (en → "Other expenses").
  - `dates by the profile zone`: profile `America/Bogota`, `capturedAt` `2026-11-05T03:30:00Z` → `date: "2026-11-04"`.
  - `requires an idempotency key` (400); `retry returns the first answer` (same key, same body → same id, one row).
  - `isolates users`: B's capture never merges into A's.
- [ ] **Step 2: Run** `pnpm vitest run apps/api/test/captures.test.ts` — Expected: FAIL (404).
- [ ] **Step 3: Implement** the route and service in one DB transaction: lock the default account; match `source = 'capture' and kind/amount/currency equal and abs(captured_at - $t) <= interval '10 minutes'` (matches confirmed ones too, per Review Focus 1); else category = memory by `merchantKey` (if its category is active) or `fallbackCategory`; insert with signed amount, `name = merchant`, `date` in the profile zone, `currency = account.currency`, and if the capture's currency differs, `note = "<amount> <CUR>"` formatted with two decimals and `needs_review = true`. Fallback: find active category with `system_key = 'other'` and the kind; else an active one with the localized name and kind (set its key); else insert one with an icon and color that `categoryFields` in `packages/core/src/schemas.ts` accepts and that read as "other".
- [ ] **Step 4: Run** the tests — Expected: PASS. Run `pnpm vitest run apps/api/test/openapi.test.ts`.
- [ ] **Step 5: Commit** `feat(api): save captures with de-duplication and the merchant memory`.

### Task 4: API: review, learning and the list filter; regenerate clients

**Files:**
- Modify: `apps/api/src/routes/transactions.ts` (list query `needsReview`, PATCH, new `POST /v1/transactions/review`), `apps/api/src/services/captures.ts` (`learn`)
- Test: `apps/api/test/captures.test.ts` (review block)
- Regenerate: `apps/web/app/api/schema.d.ts`, `apps/mcp/src/api/schema.d.ts`, `apps/mobile/lib/api/gen`

**Interfaces:**
- Produces: `GET /v1/transactions?needsReview=true`; `PATCH /v1/transactions/{id}` with `needsReview: false`; `POST /v1/transactions/review` (operationId `reviewTransactions`, body `reviewTransactionsSchema`, `200` `TransactionList`); `learn(tx, userId, row: TransactionRow): Promise<void>`.

- [ ] **Step 1: Write the failing tests:**
  - `confirming learns the merchant`: capture → PATCH `{ categoryId: comida, needsReview: false }` → next "MERCADONA 77" capture gets Comida.
  - `confirming a fallback learns nothing`; `editing without confirming learns nothing`; `a hand-typed transaction never teaches`.
  - `review confirms several and learns each`; unknown or other user's ids → 404 problem, nothing changed.
  - `lists only pending review` with `needsReview=true`.
  - `deleting a capture keeps the memory`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** `learn` upserts on (`user_id`, `merchant_key`) only when `row.source = 'capture'`, `needsReview` turned false in this request, and the category has no `system_key`.
- [ ] **Step 4: Run** the API tests, then regenerate the three clients (commands in root `AGENTS.md`) and `pnpm typecheck` — Expected: PASS, generated diffs only from these routes.
- [ ] **Step 5: Commit** `feat(api): confirm captures and learn their category` (with the regenerated files).

### Task 5: MCP: review through the assistant

**Files:**
- Modify: `packages/ai-assistant-tools/src/tools/write.ts` (`update_transaction`), `packages/ai-assistant-tools/src/tools/read.ts` (`list_transactions` output and an optional `needsReview` filter), their tests
- Modify: `packages/ai-assistant-tools/src/instructions.ts` (one line: captures are to review; confirm only when the person says so)

**Interfaces:**
- Consumes: Task 4 endpoints.

- [ ] **Step 1: Write failing tests** in the package's existing tool tests: `list_transactions` shows "por revisar" and "de Revolut" in the text and `needsReview` in structured output; `update_transaction { id, confirm: true }` sends `needsReview: false`.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/ai-assistant-tools` — FAIL.
- [ ] **Step 3: Implement** (input field `confirm: z.literal(true).optional()` described "Marks a detected transaction as reviewed").
- [ ] **Step 4: Run** — PASS; `pnpm vitest run apps/mcp`.
- [ ] **Step 5: Commit** `feat(mcp): show and confirm detected transactions`.

### Task 6: Android: bank parsers

**Prerequisite:** the founder's redacted Revolut and Google Wallet notifications (spec §7). Do Task 7 onward first if they have not arrived; this task is independent.

**Files:**
- Create: `android/.../capture/ParsedCapture.kt`, `capture/BankParser.kt`, `capture/RevolutParser.kt`, `capture/GoogleWalletParser.kt`, `capture/CaptureSources.kt`
- Test: `android/app/src/test/kotlin/com/wambito/app/capture/RevolutParserTest.kt`, `GoogleWalletParserTest.kt`

**Interfaces:**
- Produces:
  - `data class ParsedCapture(val kind: Kind, val amountCents: Long, val currency: String, val merchant: String, val capturedAt: Instant, val source: CaptureSource)`; `enum class Kind { EXPENSE, INCOME }`.
  - `enum class CaptureSource(val wire: String, val packageName: String)`: `REVOLUT("revolut", <package from the samples' app>)`, `GOOGLE_WALLET("google_wallet", <package>)`; `fun forPackage(name: String): CaptureSource?`.
  - `interface BankParser { val source: CaptureSource; fun parse(title: String?, text: String?, postedAt: Instant): ParsedCapture? }`; `object BankParsers { fun parse(source, title, text, postedAt): ParsedCapture? }`.

- [ ] **Step 1: Write failing tests**, one per format seen in the samples, with invented values: expense with decimals, expense in another currency, money in, a merchant with accents and digits, and `null` for a declined payment, a promotion, an internal pocket move and an exchange.
- [ ] **Step 2: Run** `cd apps/mobile/android && JAVA_HOME=<JDK 17> ./gradlew :app:testDebugUnitTest --console=plain --tests '*capture*'` — FAIL.
- [ ] **Step 3: Implement** one regex per format; amounts parsed to cents without floats (locale decimal comma and point).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(android): parse revolut and google wallet notifications`.

### Task 7: Android: queue, API and send job

**Files:**
- Create: `capture/CaptureQueue.kt`, `capture/CaptureApi.kt`, `capture/CaptureWorkers.kt` (`SendCapturesWorker`, `CaptureHooks` like `NoticeHooks`)
- Test: `capture/CaptureQueueTest.kt`, `capture/CaptureWorkersTest.kt` (reuse `widget/TinyHttpServer.kt`)

**Interfaces:**
- Consumes: `ParsedCapture` (Task 6; in tests construct it directly), `SessionSource`, `ServerSetting` and the server resolution `NoticeWorkers.kt` uses.
- Produces:
  - `class CaptureQueue(context)` over prefs `wambito.capture.queue`: `add(capture: ParsedCapture): QueuedCapture` (assigns a UUID `key`), `all(): List<QueuedCapture>`, `remove(key: String)`.
  - `class CaptureApi`: `send(server, token, item: QueuedCapture): ApiResult<CaptureAnswer>` (`POST /v1/captures`, `Idempotency-Key: item.key`, `x-wambito-background: 1`); `confirm(server, token, id: String): ApiResult<Unit>` (PATCH `needsReview: false`). `data class CaptureAnswer(val merged: Boolean, val id: String, val amountCents: Long, val currency: String, val name: String, val categoryName: String, val isFallback: Boolean)`, read from `captureResultDto`.
  - `object CaptureScheduler { fun enqueueSend(context) }` → unique work `wambito.capture.send`, `ExistingWorkPolicy.APPEND_OR_REPLACE`, network constraint, exponential backoff.
  - `SendCapturesWorker` hands each answer to `CapturePoster.show(context, answer)` (Task 9; a hook in tests).

- [ ] **Step 1: Write failing tests:** queue survives a new instance; `sends and removes on 201/200`; `resend after crash keeps one item` (same key on retry); `unauthorized keeps the queue` and asks the poster for one sign-in notice with the count; `server error retries` (`Result.retry()`, item kept); `unreadable server setting sends nothing`; the request body has exactly the six fields (no text field exists).
- [ ] **Step 2: Run** gradle tests — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(android): queue captures and send them to the server`.

### Task 8: Android: listener, sources and the Dart channel

**Files:**
- Create: `capture/CaptureListener.kt`, `capture/CaptureSettings.kt` (prefs `wambito.capture.sources`), `capture/CaptureChannel.kt` (`wambito/capture`)
- Modify: `android/app/src/main/AndroidManifest.xml` (service, exported, `android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"`, intent filter `android.service.notification.NotificationListenerService`), `MainActivity.kt` (register the channel), `apps/mobile/scripts/check-permissions.sh` (comment only)
- Test: `capture/CaptureListenerTest.kt`, `apps/mobile/test/tooling/manifest_test.dart`

**Interfaces:**
- Produces: channel `wambito/capture` methods `status() -> {access: "granted"|"missing", sources: ["revolut", …]}`, `setSource(source: String, enabled: Boolean)`, `openAccessSettings()`, `openAppInfo()` (for restricted settings). `CaptureListener.handle(packageName, title, text, postedAt)` (pure, testable): unknown or disabled package → returns before touching text; parsed → `CaptureQueue.add` + `CaptureScheduler.enqueueSend`.

- [ ] **Step 1: Write failing tests:** `ignores packages not enabled` (parser never called — use a recording fake parser); `queues a parsed capture and schedules sending`; `drops unparsed`; `manifest declares CaptureListener with the bind permission` in `manifest_test.dart`.
- [ ] **Step 2: Run** gradle tests and `flutter test test/tooling` — FAIL.
- [ ] **Step 3: Implement.** `onNotificationPosted` reads `EXTRA_TITLE` and `EXTRA_BIG_TEXT` (else `EXTRA_TEXT`) and `sbn.postTime`, ignores group summaries and ongoing notifications.
- [ ] **Step 4: Run** — PASS; `scripts/check-permissions.sh --dump` tests still pass.
- [ ] **Step 5: Commit** `feat(android): listen to the enabled sources' notifications`.

### Task 9: Android: the notification, Bien and the review link

**Files:**
- Create: `capture/CapturePoster.kt`, `capture/CaptureText.kt` (es/en/it/pt strings from `res/values*/strings.xml`), `capture/ConfirmReceiver.kt`, `ConfirmCaptureWorker` in `CaptureWorkers.kt`
- Modify: `notices/NoticeChannels.kt` (or a `CaptureChannels.ensure`) for channel `wambito.capture` importance LOW; `launch/LaunchLinks.kt` (`REVIEW = wambito://review`, `review(id)`); `AndroidManifest.xml` (receiver, not exported); `res/values*/strings.xml`
- Test: `capture/CaptureTextTest.kt`, `capture/CapturePosterTest.kt`, `launch/LaunchLinksTest.kt`, `test/tooling/android_strings_test.dart` passes

**Interfaces:**
- Consumes: `CaptureAnswer` (Task 7).
- Produces: `CapturePoster.show(context, answer)`, `CapturePoster.signInNeeded(context, count)`, `notificationId(transactionId: String): Int` (stable hash), `CaptureScheduler.enqueueConfirm(context, id)` → unique work `wambito.capture.confirm`, `APPEND_OR_REPLACE`, the id in input data.

- [ ] **Step 1: Write failing tests:** text es `"Anoté −12,50 € en Mercadona · Supermercado, ¿bien?"` and fallback `"Anoté −12,50 € en Mercadona · Otros gastos, ¿qué categoría?"` (money formatted with `widget/Money.kt`), en/it/pt equivalents; `same transaction same notification id`; `merged answer updates, not adds` (fake NotificationManager); group summary text `"3 gastos por revisar"`; `review(id)` → `wambito://review/<id>`; confirm worker PATCHes and cancels the notification, retries on failure.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Bien = `PendingIntent.getBroadcast` to `ConfirmReceiver` (immutable); Cambiar = activity intent to the `LaunchLinks` alias with `review(id)`.
- [ ] **Step 4: Run** gradle tests and `flutter test test/tooling` — PASS.
- [ ] **Step 5: Commit** `feat(android): notify detected transactions with bien and cambiar`.

### Task 10: Flutter: Settings → Captura automática

**Files:**
- Create: `apps/mobile/lib/capture_auto/capture_platform.dart` (channel wrapper + test fake, like `lib/notices/notice_platform.dart`), `lib/capture_auto/auto_capture_section.dart`, `lib/capture_auto/auto_capture_explainer.dart`
- Modify: `lib/settings/settings_screen.dart`, `lib/l10n/app_{es,en,it,pt}.arb`
- Test: `test/capture_auto/auto_capture_section_test.dart`

**Interfaces:**
- Consumes: channel `wambito/capture` (Task 8).
- Produces: `autoCapturePlatformProvider` (Riverpod), `AutoCaptureStatus { bool access; Set<String> sources }`.

- [ ] **Step 1: Write failing widget tests:** first switch on shows the explainer (copy says which apps, that text stays on the phone, what reaches the server) before `openAccessSettings`; with access missing and a source on, the row says "Falta el permiso" with "Activar"; a "¿No te deja?" link shows the restricted-settings steps and calls `openAppInfo`; status re-reads on app resume.
- [ ] **Step 2: Run** `flutter test test/capture_auto` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `flutter test --exclude-tags golden`, `flutter analyze` — PASS.
- [ ] **Step 5: Commit** `feat(mobile): turn automatic capture on in settings`.

### Task 11: Flutter: home row and review inbox

**Files:**
- Create: `lib/review/review_repository.dart`, `lib/review/review_screen.dart`
- Modify: `lib/home/home_screen.dart` (row), transaction row widget used by home (mark "por revisar · de Revolut"), `lib/router.dart` (`/review`, `/review/:id`), `lib/launch/launch_links.dart` (`LaunchAction.review` with optional id), `MainActivity`'s link hand-off if it filters hosts, ARBs
- Test: `test/review/review_screen_test.dart`, `test/home/…` row test, `test/launch/…`

**Interfaces:**
- Consumes: Task 4 endpoints through `lib/api/gen`.

- [ ] **Step 1: Write failing tests:** home shows "3 gastos por revisar" only when pending > 0 and opens `/review`; Bien removes the row and calls PATCH; "Confirmar todos" calls `reviewTransactions` with all ids; `/review/<id>` opens that item's editor; `wambito://review/<id>` routes there after the session loads; `manifest_test` still counts `android:host="due"` once.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** (reuse the add sheet's edit form for Cambiar).
- [ ] **Step 4: Run** `flutter test --exclude-tags golden`, `flutter analyze` — PASS.
- [ ] **Step 5: Commit** `feat(mobile): review detected transactions`.

### Task 12: Web: mark, filter and confirm

**Files:**
- Modify: `apps/web/app/features/home/Home.tsx`, `home-model.ts` (+ test), `apps/web/app/i18n/messages/{es,en,it,pt}.json`, `Home.stories.tsx`
- Test: `apps/web/app/features/home/home-model.test.ts`

- [ ] **Step 1: Write failing tests:** the model marks `needsReview` rows and knows the source label ("de Revolut", "de Google Wallet"); the "Por revisar" filter keeps only them; confirm calls PATCH `needsReview: false` and drops the mark.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/web` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web tests, `pnpm lint`, `pnpm typecheck` — PASS.
- [ ] **Step 5: Commit** `feat(web): show and confirm detected transactions`.

### Task 13: Privacy copy and maps

**Prerequisite:** `feat/legal-pages` merged into `main` (the privacy pages live there).

**Files:**
- Modify: the privacy policy content in `apps/web/app/features/legal/` (es, en, it, pt), `legal.test.ts`; `apps/mobile/AGENTS.md` (`capture/` folder, persistent names, the channel), `apps/api/AGENTS.md` (captures route), `packages/core/AGENTS.md` (capture module)

- [ ] **Step 1: Write the failing test** in `legal.test.ts`: each language's privacy page has an automatic-capture section naming Revolut and Google Wallet and saying the notification text stays on the phone.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Write** the section: which apps are read, processed on the phone, what reaches the server (amount, merchant, date, source), how to turn it off.
- [ ] **Step 4: Run** web tests, `scripts/check-old-name.sh`, `pnpm lint` — PASS.
- [ ] **Step 5: Commit** `docs: privacy and maps for automatic capture`.

### Final check

- [ ] Root: `pnpm lint && pnpm typecheck && pnpm test`; mobile: `flutter analyze`, `flutter test --exclude-tags golden`, gradle unit tests; `scripts/check-permissions.sh` on a release build.
- [ ] On the founder's phone (debug build): enable Revolut, make a purchase, see the silent notification, tap Bien, see it confirmed on the web.
