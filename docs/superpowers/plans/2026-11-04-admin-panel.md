# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An account-management panel at `/admin` (look-up, email change, deletion, sessions,
assistants, passkeys, suspension, user metrics, audit log) that never touches finance data.

**Architecture:** Admin routes `/v1/admin/*` in `apps/api` behind a `requireAdmin` guard (cookie
session, id in `ADMIN_USER_IDS`, optional IP allowlist, passkey verification < 15 min). Services in
`apps/api/src/services/admin/` touch identity tables only; every action and its `admin_audit` row
share one transaction. The web panel is a lazy layout in `apps/web`; `/confirm-email` is a public
page for the email change.

**Tech Stack:** Hono + `@hono/zod-openapi`, Better Auth 1.7.11, `@simplewebauthn/server` 13.3.3 /
`@simplewebauthn/browser` 13.3.0 (the versions `@better-auth/passkey` already pulls), Drizzle +
Postgres (RLS), React Router 8, use-intl, recharts 3.10.1, Vitest + testcontainers, Playwright,
Flutter (one string).

**Spec:** `docs/superpowers/specs/2026-11-04-admin-panel-design.md`

## Global Constraints

- `ADMIN_USER_IDS` empty or unset → every `/v1/admin/*` route answers **404** and `/admin` shows the
  not-found page.
- Non-admin, disallowed IP, OAuth bearer token, bearer session token → **404** `not_found`.
- Missing or stale verification → **401** `admin_verification_required`; fresh = **< 15 minutes**.
- Reason: **1–300** characters, required on every action except look-up, metrics and audit.
- Email-change link valid **24 hours**; only the token's SHA-256 is stored.
- Audit list: newest first, **50** per page. Metrics: **12** ISO weeks (UTC), 7-day windows, 30-day
  active.
- Error codes, exactly: `not_found`, `admin_verification_required`, `user_not_found`,
  `email_taken`, `is_guest`, `cannot_target_self`, `link_expired`, `account_suspended`.
- Audit actions, exactly: `admin.verified`, `email.change_requested`, `email.change_confirmed`,
  `account.delete`, `sessions.revoke`, `assistant.revoke`, `passkey.remove`, `account.suspend`,
  `account.reactivate`.
- `email_hash` = SHA-256 hex of `email.trim().toLowerCase()`.
- No admin code imports a finance table (`accounts`, `categories`, `categoryBudgets`,
  `recurrences`, `imports`, `transactions`, `idempotencyKeys`) except through `deleteAccount`.
- Emails: es/en/it/pt, the user's `locale`, no internal reason, ending "If this wasn't you, write
  to privacy@wambito.com" (translated). Never mail a `.invalid` address (`assertDeliverable`).
- Panel copy: es + en (`admin.{es,en}.json`); `/confirm-email`, the suspended message and emails:
  all four languages.
- Repo rules: failing test first; Conventional Commits (`feat(api): …`, lowercase); stage by path;
  **no `Co-Authored-By` line**; no personal names or real data; regenerate generated files, never
  hand-edit them; never read `.env` files.

## Review Focus

1. **An admin whose session expires mid-action** (verification 15 min old while a form is open):
   the action must answer 401 and the panel must re-ask the passkey and keep the typed reason,
   not lose it. → Task 11 test `keeps the reason after re-verifying`.
2. **Email change to an address that differs only in case or spaces from an existing account**
   (`Ana@X.com ` vs `ana@x.com`): must be 409 `email_taken`, not a duplicate. → Task 8 test
   `normalizes the new email before the taken check`.
3. **Two confirmations of the same link at once** (double click, two tabs): exactly one succeeds,
   one audit row. → Task 8 test `a link confirms once under concurrency`.
4. **Looking up a guest** (placeholder email under `guest.wambito.invalid`): look-up by id works,
   the panel shows "guest" instead of the placeholder, delete confirms by id, no email is ever sent.
   → Task 7 test `deleting a guest sends no email`, Task 11 story `GuestAccount`.
5. **Suspending a user who is mid-OAuth flow** (an assistant holding a refresh token): the refresh
   must fail afterwards. → Task 5 test `a suspended user's refresh token is refused`.

---

### Task 1: Schema, migration and grants

**Files:**
- Modify: `packages/db/src/schema/domain.ts` (new tables), `packages/db/src/schema/auth.ts`
  (`user.suspendedAt`), `packages/db/src/bootstrap.ts` (`grantAppRole`)
- Create: `packages/db/drizzle/0008_admin.sql` (+ `meta`, via `pnpm --filter @wambito/db generate`,
  then hand-append the RLS statements, as `0001_rls.sql` does)
- Test: `packages/db/test/admin-tables.test.ts` (follow the existing db test layout)

**Interfaces:**
- Produces (exported from `@wambito/db`):
  - `user.suspendedAt`: `timestamp("suspended_at", { withTimezone: true })`, nullable.
  - `adminAudit` (`admin_audit`): `id text pk` (uuid default), `at timestamptz default now not null`,
    `adminUserId text null`, `action text not null`, `targetUserId text null`, `emailHash text null`,
    `reason text null`, `detail jsonb null`; index on `(at desc)` and on `target_user_id`. No FKs.
  - `adminVerification` (`admin_verification`): `sessionId text pk → session.id on delete cascade`,
    `verifiedAt timestamptz not null`.
  - `emailChange` (`email_change`): `id text pk`, `userId text unique → user.id on delete cascade`,
    `newEmail text not null`, `tokenHash text unique not null`, `expiresAt timestamptz not null`,
    `createdBy text not null`, `createdAt timestamptz default now`.
- RLS on all three new tables: `ENABLE ROW LEVEL SECURITY` + one policy `admin_rw` `FOR ALL TO
  wambito_app USING (true) WITH CHECK (true)` (use `APP_ROLE`'s name as `0001` does).
- `grantAppRole`: after the existing grants, `REVOKE UPDATE, DELETE ON admin_audit FROM <app role>`.

- [ ] **Step 1: Write the failing test** `admin-tables.test.ts`:
  - `the app role can insert and select admin_audit` — insert one row as the app role, select it.
  - `the app role cannot update or delete admin_audit` — both reject with `permission denied`.
  - `admin_audit rows outlive the user` — insert a user and an audit row naming it, delete the user
    (admin role), the audit row is still there.
  - `admin_verification and email_change cascade` — deleting the session / user removes the rows.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/db` — FAIL (tables missing).
- [ ] **Step 3: Add the schema, generate the migration, append RLS, update `grantAppRole`.**
  Declare `suspendedAt` in `auth.ts` by hand (the generator would drop it on the next
  `auth:generate`, so Task 5 also declares it as a Better Auth additional field).
- [ ] **Step 4: Run** the db project — PASS. Run `pnpm typecheck`.
- [ ] **Step 5: Update `packages/db/AGENTS.md`** (Rules: "`admin_audit` is append-only: the app
  role has no UPDATE/DELETE on it, `grantAppRole` revokes them.") and **commit**
  `feat(db): admin audit, verification and email-change tables`.

### Task 2: Admin config and the client IP

**Files:**
- Modify: `apps/api/src/config.ts`, `.env.example`, `deploy/personal/.env.example`
- Create: `apps/api/src/http/client-ip.ts`
- Test: `apps/api/test/config.test.ts`, `apps/api/test/client-ip.test.ts`

**Interfaces:**
- Produces: `config.ADMIN_USER_IDS: string[]` (trimmed, empties dropped; unset → `[]`),
  `config.ADMIN_ALLOWED_IPS: string[] | undefined` (IPs or CIDRs, validated with `isCidr`; blank →
  `undefined`).
- Produces: `clientIp(headers: Headers, config: Pick<Config, "CLIENT_IP_HEADER" |
  "TRUSTED_PROXIES">): string | null` — the same address Better Auth's `advanced.ipAddress` picks
  (right-most entry of the header that is not a trusted proxy). `ipAllowed(ip: string | null,
  allowed: string[]): boolean` (IPv4 and IPv6 CIDR match with `node:net`'s `BlockList`).

- [ ] **Step 1: Failing tests.** config: `ADMIN_USER_IDS "a, b,," → ["a","b"]`; unset → `[]`;
  `ADMIN_ALLOWED_IPS "1.2.3.4,10.0.0.0/8"` accepted; `"nope"` → throws mentioning
  `ADMIN_ALLOWED_IPS`. client-ip: `"198.51.0.1, 10.0.0.1"` with trusted `10.0.0.0/8` →
  `"198.51.0.1"`; `ipAllowed("10.1.2.3", ["10.0.0.0/8"])` true; `ipAllowed("::1", ["::1"])` true;
  `ipAllowed(null, [...])` false.
- [ ] **Step 2: Run** `pnpm vitest run apps/api/test/config.test.ts apps/api/test/client-ip.test.ts`
  — FAIL.
- [ ] **Step 3: Implement.** In both `.env.example` files add commented `ADMIN_USER_IDS=` and
  `ADMIN_ALLOWED_IPS=` with one-line explanations (empty = panel off; see `docs/admin.md`).
- [ ] **Step 4: Run** — PASS. **Commit** `feat(api): admin settings and the client address`.

### Task 3: Shared account services

**Files:**
- Create: `apps/api/src/services/account.ts`
- Modify: `apps/api/src/routes/me.ts` (`DELETE /v1/me`), `apps/api/src/routes/assistants.ts`
  (`DELETE /v1/me/assistants/{clientId}`)
- Test: existing `apps/api/test/me.test.ts`, `apps/api/test/assistants.test.ts`

**Interfaces:**
- Produces:
  - `deleteAccount(tx: Db | Tx, userId: string): Promise<boolean>` — deletes the `user` row
    (everything cascades); false when no row.
  - `revokeAssistant(tx: Db | Tx, userId: string, clientId: string): Promise<boolean>` — the three
    deletes of today's route; false when no consent was removed.
  - `revokeAllAssistants(tx: Tx, userId: string): Promise<number>` — the same for every client.
  - `revokeSessions(tx: Db | Tx, userId: string): Promise<number>` — deletes all sessions.

- [ ] **Step 1: Add tests** in `me.test.ts`/`assistants.test.ts` only if a behaviour is not
  covered yet (`revokeSessions` and `revokeAllAssistants` get direct tests in a new
  `apps/api/test/account-service.test.ts`: counts returned, other users untouched).
- [ ] **Step 2: Run** them — the new ones FAIL.
- [ ] **Step 3: Implement and switch both routes to the services** (no behaviour change).
- [ ] **Step 4: Run** `pnpm vitest run apps/api` — PASS. **Commit**
  `refactor(api): account deletion and revocation as shared services`.

### Task 4: The admin guard, the audit writer and passkey verification

**Files:**
- Create: `apps/api/src/http/admin.ts`, `apps/api/src/services/admin/audit.ts`,
  `apps/api/src/services/admin/verify.ts`, `apps/api/src/routes/admin.ts`
- Modify: `apps/api/src/app.ts` (mount), `apps/api/package.json` (`@simplewebauthn/server`
  `13.3.3`), `apps/api/src/env.ts` (if a context var is needed)
- Create: `apps/api/test/soft-passkey.ts` (test helper), `apps/api/test/admin-guard.test.ts`

**Interfaces:**
- Consumes: `clientIp`, `ipAllowed`, `config.ADMIN_*` (Task 2); `requireUser` (existing).
- Produces:
  - `type AuditAction` = the nine actions of Global Constraints.
  - `emailHash(email: string): string`.
  - `recordAudit(tx: Db | Tx, entry: { adminUserId: string | null; action: AuditAction;
    targetUserId?: string; emailHash?: string; reason?: string; detail?: Record<string, string> }):
    Promise<void>`.
  - `requireAdmin(auth, deps, { verified: boolean })` Hono middleware; sets `c.get("adminId")`
    and `c.get("sessionId")`. `ADMIN_VERIFY_MS = 15 * 60 * 1000`; clock = `deps.now`.
  - `reasonField = z.string().trim().min(1).max(300)` exported from `routes/admin.ts` for the
    action routes.
  - Routes (OpenAPI tag `admin`): `POST /v1/admin/verify/options` → WebAuthn request options
    (`userVerification: "required"`, `allowCredentials` = the admin's passkeys, `rpID` = WEB_URL
    host); challenge stored in Better Auth's `verification` table, identifier
    `admin-verify:<sessionId>`, 5 minutes. `POST /v1/admin/verify` (body: the authentication
    response JSON) → verifies with `verifyAuthenticationResponse` (`expectedOrigin` =
    `passkeyOrigins(config)`, `requireUserVerification: true`, the stored passkey's public key and
    counter, as `@better-auth/passkey`'s `verify-authentication` does), updates the counter, upserts
    `admin_verification`, records `admin.verified`, answers 204. It creates no session.
    `GET /v1/admin/me` → `{ id, verifiedUntil }` (needs verification), used by the panel.
- `soft-passkey.ts`: `createSoftPasskey(adminDb, userId, rpId): Promise<{ assert(options, origin):
  AuthenticationResponseJSON }>` — a P-256 key from `node:crypto`, its COSE public key inserted
  into `passkey` as the plugin stores it, and `assert` builds `clientDataJSON`, `authenticatorData`
  (rpIdHash, flags UP|UV, counter) and the ES256 signature.

- [ ] **Step 1: Failing tests** `admin-guard.test.ts` (`createTestApp` with `ADMIN_USER_IDS`):
  - `no admins configured → 404 on every admin route`;
  - `a signed-in non-admin → 404`;
  - `an admin with an assistant's OAuth token → 404` (use `authorize`);
  - `an admin with a bearer session token → 404` (harness `signIn` headers);
  - `an admin from an IP outside ADMIN_ALLOWED_IPS → 404`;
  - `an admin with an email-code session and no verification → 401 admin_verification_required`;
  - `a valid passkey assertion verifies: 204, admin_verification row, one admin.verified audit
    row, no new session row`;
  - `an assertion with another user's passkey → 400, nothing written`;
  - `verification 16 minutes old → 401` (pinned `now`); `14 minutes old → 200 on GET /v1/admin/me`.
  The harness's `signIn` returns a bearer header; add a `signInCookie(email)` helper to
  `harness.ts` that returns the `cookie` header from the sign-in response instead.
- [ ] **Step 2: Run** `pnpm vitest run apps/api/test/admin-guard.test.ts` — FAIL.
- [ ] **Step 3: Implement** guard order exactly as spec §4.2 (session kind → admin id → IP →
  verification). Refuse a bearer session token by checking the request carried no
  `authorization` header.
- [ ] **Step 4: Run** — PASS; `pnpm vitest run apps/api/test/openapi.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(api): admin guard with passkey verification`.

### Task 5: Suspension blocks sign-in

**Files:**
- Modify: `apps/api/src/auth.ts` (additional field `suspendedAt`, `databaseHooks.session.create.
  before`), `apps/api/src/http/session.ts` (`oauthUser` and session path)
- Modify: `apps/web/app/features/sign-in/auth.ts` (+ `app.{es,en,it,pt}.json`),
  `apps/mobile/lib/entry/auth_errors.dart` (+ `apps/mobile/lib/l10n/app_{es,en,it,pt}.arb`)
- Test: `apps/api/test/suspension.test.ts`, `apps/web/app/features/sign-in/auth.test.ts`, the
  mobile test that covers `auth_errors.dart`

**Interfaces:**
- Produces: `accountSuspended()` → `APIError("FORBIDDEN", { code: "account_suspended", message:
  "This account is suspended" })` in `auth.ts`; `requireUser` throws
  `ApiError(403, "account_suspended", …)` for a suspended user on either path.
- Copy (es): "Tu cuenta está suspendida. Escríbenos a privacy@wambito.com." (en: "Your account is
  suspended. Write to privacy@wambito.com."; it/pt translated, PT-PT).

- [ ] **Step 1: Failing tests** `suspension.test.ts` (set `suspended_at` with the admin db):
  `a suspended user cannot sign in by email code → 403 account_suspended`;
  `a suspended user's existing OAuth access token → 403`;
  `a suspended user's refresh token is refused` (set `suspended_at` directly, without revoking,
  then refresh at the token endpoint → not 200);
  `clearing suspended_at lets them sign in`.
  Web: `auth.ts` maps `account_suspended` to the message key. Mobile: same mapping.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** The session-create hook reads `user.suspended_at` for
  `session.userId` and throws `accountSuspended()`. For the refresh token, the
  `oauthProvider` path creates no Better Auth session: block it in `hooks.before` on
  `/oauth2/token` with `grant_type=refresh_token` by looking up the token's user.
- [ ] **Step 4: Run** api, web unit, `flutter test` for the mobile file — PASS.
- [ ] **Step 5: Commit** `feat(api): suspended accounts cannot sign in`.

### Task 6: Look-up, metrics, audit list, and the boundary test

**Files:**
- Create: `apps/api/src/services/admin/lookup.ts`, `apps/api/src/services/admin/metrics.ts`
- Modify: `apps/api/src/routes/admin.ts`
- Test: `apps/api/test/admin-read.test.ts`, `apps/api/test/admin-boundary.test.ts`

**Interfaces:**
- Produces:
  - `lookupUser(db, by: { email: string } | { id: string }): Promise<AdminUserView | null>` with
    `AdminUserView = { id, email: string | null /* null for a guest */, isAnonymous, locale,
    createdAt, lastActiveAt, suspendedAt: string | null, sessionCount, passkeys: { id, name,
    deviceType, createdAt }[], assistants: { clientId, name, consentedAt }[] }`.
  - `adminMetrics(db, now: Date): Promise<{ total, withEmail, guests, active30d, suspended,
    signups7d, signupsPrev7d, weekly: { weekStart: string /* YYYY-MM-DD, ISO Monday UTC */,
    withEmail, guests }[] /* 12 */ }>` — SQL aggregates only.
  - Routes: `GET /v1/admin/users?email=|id=` (404 `user_not_found`), `GET /v1/admin/metrics`,
    `GET /v1/admin/audit?before=<iso>&targetUserId=` → `{ entries: AuditView[], next: string |
    null }`, 50 per page.

- [ ] **Step 1: Failing tests** `admin-read.test.ts` (verified admin from Task 4's helper):
  look-up by email (case/space-insensitive) and by id returns exactly the `AdminUserView` keys;
  a guest's `email` is `null`; the response JSON contains no key from the finance tables
  (assert the key set); look-up writes no audit row; metrics over a fixture of 3 email users, 2
  guests (one created 40 days ago, idle), 1 suspended, with pinned `now` give the exact numbers and
  12 weeks; audit pages of 50 with `next`.
  `admin-boundary.test.ts`: reads every file under `src/services/admin/` and `src/routes/admin.ts`,
  fails if an import names any finance table of Global Constraints.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): admin look-up, user metrics and the audit list`.

### Task 7: Account actions and their emails

**Files:**
- Create: `apps/api/src/services/admin/actions.ts`, `apps/api/src/emails/admin.ts`
- Modify: `apps/api/src/routes/admin.ts`
- Test: `apps/api/test/admin-actions.test.ts`, `apps/api/test/admin-emails.test.ts`

**Interfaces:**
- Consumes: Task 3 services, `recordAudit`, `emailHash`, `reasonField`.
- Produces:
  - `adminMail(kind: AdminMailKind, locale: string, extra?: { link?: string; assistant?: string;
    passkey?: string }): Mail` minus `to`, where `AdminMailKind = "email_change_link" |
    "email_changed" | "account_deleted" | "account_suspended" | "account_reactivated" |
    "sessions_revoked" | "assistant_revoked" | "passkey_removed"`. Layout like
    `emails/sign-in.ts`; unknown locale → `es`.
  - Routes (body `{ reason }`, delete also `{ confirm }` = the email, or the id for a guest):
    `DELETE /v1/admin/users/{id}`, `POST /v1/admin/users/{id}/sessions/revoke`,
    `DELETE /v1/admin/users/{id}/assistants/{clientId}`,
    `DELETE /v1/admin/users/{id}/passkeys/{passkeyId}`, `POST /v1/admin/users/{id}/suspend`,
    `POST /v1/admin/users/{id}/reactivate`. All 204; 404 `user_not_found`; 409
    `cannot_target_self` for delete/suspend of `adminId`; 400 when `confirm` does not match.
  - Suspend = set `suspendedAt` + `revokeSessions` + `revokeAllAssistants` + audit, one tx.
  - Mail sent after commit, to the email read before the action; errors logged, not thrown.

- [ ] **Step 1: Failing tests** `admin-actions.test.ts`, one `describe` per action: effect done;
  exactly one audit row with `action`, `targetUserId`, `reason`, `detail` (`clientId`/
  `passkeyId`), `emailHash` only on delete; the email in `MemoryMailer` with the right subject
  for the user's locale; `cannot_target_self`; a forced failure (stub `recordAudit` to throw)
  leaves the effect undone; `deleting a guest sends no email`; `a missing reason → 400`.
  `admin-emails.test.ts`: every kind × locale has a subject and the privacy@wambito.com line.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): admin account actions with audit and notices`.

### Task 8: Email change

**Files:**
- Create: `apps/api/src/services/admin/email-change.ts`
- Modify: `apps/api/src/routes/admin.ts`, `apps/api/src/app.ts` (the public confirm route; put it
  in a small `routes/email-change.ts`)
- Test: `apps/api/test/email-change.test.ts`

**Interfaces:**
- Produces:
  - `POST /v1/admin/users/{id}/email-change` body `{ newEmail, reason }` → 204; 409 `email_taken`
    (after trim + lowercase), 409 `is_guest`, 404 `user_not_found`. Stores a 32-byte random token
    (base64url) as SHA-256, replaces a pending row, audit `email.change_requested` (emailHash = the
    current email), mails `email_change_link` with `${WEB_URL}/confirm-email?token=…` to the new
    address.
  - `POST /v1/email-change/confirm` body `{ token }` (public; Better-Auth-style rate limit: 10 per
    10 min per IP via the existing `rateLimit` table or a simple per-IP check) → 204; 410
    `link_expired` (unknown, used, expired); 409 `email_taken`. One tx: `delete … returning` the
    `email_change` row (so concurrent confirms race on the delete), update `user.email` +
    `emailVerified`, `revokeSessions`, audit `email.change_confirmed` (`adminUserId` null,
    emailHash = the old email). Then mail `email_changed` to the old address.

- [ ] **Step 1: Failing tests:** request → link mailed to the new address, row stored with a hash
  (the raw token is not in the db); `normalizes the new email before the taken check`; guest → 409
  `is_guest`; confirm → email changed, sessions gone, audit row, old address notified; second
  confirm → 410; at 24 h + 1 s → 410 (pinned `now`); new email taken meanwhile → 409 and nothing
  changed; `a link confirms once under concurrency` (two `Promise.all` confirms → one 204, one 410,
  one audit row).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Regenerate client types** `pnpm --filter @wambito/web api:types --file` and
  `pnpm --filter @wambito/mcp api:types`; update `apps/api/AGENTS.md` (admin routes, guard,
  `ADMIN_*`, `services/admin/` touches identity tables only). **Commit**
  `feat(api): email change confirmed by the person`.

### Task 9: Admin layout, verification screen and messages (web)

**Files:**
- Modify: `apps/web/app/routes.ts` (an `admin` layout beside `app-layout`, inside the non-landing
  branch), `apps/web/app/i18n/messages.test.ts` (admin files: es/en parity only),
  `apps/web/package.json` (`@simplewebauthn/browser` `13.3.0`)
- Create: `apps/web/app/routes/admin.tsx` (layout), `apps/web/app/routes/admin._index.tsx`,
  `apps/web/app/routes/admin.users.$id.tsx`, `apps/web/app/admin/AdminMessages.tsx`,
  `apps/web/app/admin/use-admin.ts`, `apps/web/app/admin/VerifyScreen.tsx`,
  `apps/web/app/i18n/messages/admin.{es,en}.json`
- Test: `apps/web/app/admin/use-admin.test.ts`, `apps/web/app/admin/VerifyScreen.stories.tsx`

**Interfaces:**
- Consumes: `GET /v1/admin/me`, `POST /v1/admin/verify/options`, `POST /v1/admin/verify`.
- Produces: `useAdmin(): { state: "loading" | "not_found" | "needs_verification" | "ready";
  verify(): Promise<void>; verifiedUntil?: Date }`; `adminFetch` wrapper that turns a 401
  `admin_verification_required` into `state = "needs_verification"` without dropping the caller's
  pending request (it resolves after re-verification, or rejects on cancel).
- Layout: reuses the app's `ApiProvider` and theme; wraps in `AdminMessages` (locale es or en; it
  and pt fall back to en); `not_found` renders `routes/not-found.tsx`'s component; signed-out →
  `/sign-in?next=/admin`. `VerifyScreen` explains and has one button "Confirmar con tu passkey";
  no passkey → text + link to `/app/settings`.

- [ ] **Step 1: Failing tests:** `use-admin.test.ts` — 404 → `not_found`; 401 code →
  `needs_verification`; after `verify()` the pending request is retried once. Storybook stories
  `Verify`, `VerifyNoPasskey`, `VerifyFailed`. `messages.test.ts` passes with es/en admin parity.
- [ ] **Step 2: Run** `pnpm vitest run apps/web` — FAIL. **Step 3: Implement.** **Step 4:**
  PASS; `pnpm --filter @wambito/web build` and `build:landing` (the landing build has no admin
  chunk: grep the landing output for `admin`).
- [ ] **Step 5: Commit** `feat(web): admin layout and passkey verification`.

### Task 10: Admin home: metrics and audit (web)

**Files:**
- Create: `apps/web/app/admin/HomeScreen.tsx`, `apps/web/app/admin/MetricCards.tsx`,
  `apps/web/app/admin/SignupsChart.tsx`, `apps/web/app/admin/AuditList.tsx`,
  `apps/web/app/admin/LookupBox.tsx`, `apps/web/app/admin/Home.stories.tsx`
- Modify: `apps/web/app/routes/admin._index.tsx`

**Interfaces:**
- Consumes: `GET /v1/admin/metrics`, `GET /v1/admin/audit`, `GET /v1/admin/users`.
- Order on screen (spec §6): cards (total; with email; guests; active 30 d; sign-ups 7 d with the
  previous 7 d beside), stacked weekly bar chart (recharts, design tokens for colours), suspended
  count, the 50 latest audit rows ("Load more" via `next`), look-up box. Look-up success →
  navigate to `/admin/users/:id`; miss → inline "No account with that email or id".

- [ ] **Step 1: Failing stories/tests:** stories `Home`, `HomeEmpty` (all zeros), `HomeLoading`,
  `HomeError`; a test that the look-up box trims and sends `email=` when the input has `@`, else
  `id=`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(web): admin home with user metrics`.

### Task 11: Account screen and actions (web)

**Files:**
- Create: `apps/web/app/admin/AccountScreen.tsx`, `apps/web/app/admin/ActionSheet.tsx`,
  `apps/web/app/admin/Account.stories.tsx`
- Modify: `apps/web/app/routes/admin.users.$id.tsx`

**Interfaces:**
- Consumes: Task 6–8 routes, `adminFetch`.
- `ActionSheet` (reuses `ui/Sheet`, `ui/PressButton`): a reason field (1–300, counter, the hint
  "No personal data here"), delete adds the confirm field (email, or the id for a guest, as
  `DeleteAccount.tsx` does with `emailMatches`); a ref guards double submits; error stays in the
  sheet.
- Account screen: the `AdminUserView` (guest shown as "Guest", not the placeholder), the account's
  audit entries (`targetUserId=`), buttons per action; own account → delete/suspend disabled with a
  note.

- [ ] **Step 1: Failing tests:** stories `Account`, `GuestAccount`, `SuspendedAccount`,
  `OwnAccount`; a test `keeps the reason after re-verifying` (the action gets 401, verification
  runs, the sheet still holds the reason and the retried request carries it).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(web): admin account screen and actions`.

### Task 12: `/confirm-email` (web)

**Files:**
- Create: `apps/web/app/routes/confirm-email.tsx`, `apps/web/app/features/confirm-email/
  ConfirmEmail.tsx`, `…/ConfirmEmail.stories.tsx`
- Modify: `apps/web/app/routes.ts` (under the app layout), `app.{es,en,it,pt}.json`
  (`confirm_email.*`)

**Interfaces:**
- Consumes: `POST /v1/email-change/confirm`.
- Behaviour: reads `token` from the query, shows a "Confirmar mi nuevo email" button (no automatic
  POST on load, so mail scanners that open links do not use them up), then success ("Listo. Entra
  con tu nuevo email." + link to `/sign-in`), `link_expired`, `email_taken`.

- [ ] **Step 1: Failing stories:** `Ready`, `Done`, `Expired`, `Taken`, `NoToken`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm vitest run apps/web`
  — PASS (messages parity across four languages).
- [ ] **Step 5: Update `apps/web/AGENTS.md`** (the admin layout, `admin.{es,en}.json` and its
  parity exception, `/confirm-email`). **Commit** `feat(web): confirm an email change`.

### Task 13: Seeded admin and the e2e

**Files:**
- Create: `apps/api/src/scripts/seed-admin.ts`, `apps/web/e2e/admin.spec.ts`
- Modify: `apps/api/package.json` (`"seed:admin": "tsx --env-file-if-exists=../../.env
  src/scripts/seed-admin.ts"`), `docker-compose.yml` (api: `ADMIN_USER_IDS:
  ${ADMIN_USER_IDS:-dev-admin}`), `.github/workflows/ci.yml` (e2e job, after `docker compose up`:
  `docker compose exec -T api pnpm --filter @wambito/api seed:admin`), `apps/web/e2e/helpers.ts`

**Interfaces:**
- `seed-admin.ts`: upserts user `id = "dev-admin"`, `email = "admin@wambito.test"`,
  `emailVerified = true`, through `DATABASE_ADMIN_URL`; idempotent.
- `helpers.ts`: `addVirtualAuthenticator(page)` — CDP `WebAuthn.enable` +
  `WebAuthn.addVirtualAuthenticator({ protocol: "ctap2", transport: "internal", hasResidentKey:
  true, hasUserVerification: true, isUserVerified: true })`.

- [ ] **Step 1: Write the e2e** `admin.spec.ts`: a fresh user signs in (existing helper); the
  admin signs in as `admin@wambito.test`, adds a passkey in settings with the virtual
  authenticator, opens `/admin`, confirms with the passkey, sees the cards, looks up the fresh
  user's email, suspends with a reason, sees "Suspended" and the audit row. A second test: a
  non-admin opening `/admin` sees the not-found page.
- [ ] **Step 2: Run** `E2E_NOW=2026-10-21T15:00:00Z docker compose up -d --build`, the seed, then
  `pnpm --filter @wambito/web e2e admin` — FAIL first if any wiring is missing, then PASS.
- [ ] **Step 3: Commit** `test(web): admin panel end to end`. Afterwards `docker compose stop`.

### Task 14: Docs and the final check

**Files:**
- Create: `docs/admin.md`
- Modify: `docs/AGENTS.md` (map line), `deploy/personal/README.md` (turning the panel on),
  root `AGENTS.md` (map: `docs/admin.md`)

- [ ] **Step 1: Write `docs/admin.md`** with spec §8's content: who is an admin and how to add one
  (look-up the id, add to `ADMIN_USER_IDS`, restart the API), optional `ADMIN_ALLOWED_IPS`,
  Ley 1581 deadlines (consultations 10 business days, claims 15), consultation / deletion /
  correction procedures, the 14-day backup sentence, and the dry run (suspend, reactivate, delete a
  test account).
- [ ] **Step 2: Run the full CI set locally:** `./scripts/check-old-name.sh`, `pnpm lint`,
  `pnpm --filter @wambito/web tokens` + the two `api:types` commands with `git diff --exit-code`,
  `pnpm typecheck`, `pnpm test` — all PASS.
- [ ] **Step 3: Commit** `docs: the admin panel and data-subject requests`.
