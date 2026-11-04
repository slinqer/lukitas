# Wambito: the admin panel (account management)

- **Date:** 2026-11-04
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-04.
- **Why now:** Wambito opens sign-up to everyone once this panel works (the `SIGN_IN_ALLOWLIST`
  goes, as a separate step). The privacy page promises that account deletion can be requested by
  email (privacy@wambito.com); the panel is how those requests, and the other data-subject requests
  of Colombia's Ley 1581 de 2012, are fulfilled.
- **Founder decisions (2026-11-04):**
  1. A **web panel now**, not a CLI first.
  2. It lives at **`/admin` in `apps/web`**, on the app's own origin, not on a subdomain (passkeys
     are bound to the app's host, `rpID` = WEB_URL host; a subdomain would need its own sign-in).
  3. **Who is an admin is server configuration** (`ADMIN_USER_IDS`), never a database flag, as in
     Vaultwarden, Bitwarden and Ente. Write access to the database does not make anyone an admin.
  4. Signing in to the panel needs a **recent passkey verification**; an email-code session is not
     enough. An IP allowlist exists but is **optional and off** by default.
  5. The panel **never shows finances**: no amounts, no transactions, not even a count of them. No
     impersonation, no export of a user's data by an admin.
  6. **No browsable list of users**: look-up by exact email or id only. The home screen leads with
     **aggregate user metrics** (the founder's priority) and the latest audit entries.

## 1. Goal

After this work:

- An admin opens `https://app.wambito.com/admin`, confirms with a passkey, and sees how many
  people use Wambito (totals, guests, active in 30 days, sign-ups per week).
- The admin looks up one account by email or id and can: change its email (confirmed by the
  person), delete it (the same path as in-app deletion), sign out all its sessions, revoke an AI
  assistant, remove a passkey, suspend or reactivate it.
- Every admin action needs a reason, is written to an append-only audit log in the same
  transaction, and sends the affected person an email.
- A self-hoster (`deploy/personal`) gets the same panel by putting their own user id in
  `ADMIN_USER_IDS`. With the variable empty (the default) the panel does not exist.
- No code path added by this work reads a finance table.

## 2. Fit with the local-first direction

The long-term direction is local-first with end-to-end encrypted data. The panel touches only
**identity**: the `user`, `session`, `passkey` and OAuth tables. A local-first Wambito still needs
that identity on a server (the account, device sync, assistants), so the panel stays useful. When
finance data becomes ciphertext, deleting an account keeps working unchanged: rows are deleted
without being read. The panel opens no new path to finance data, and a test (§9) keeps it that way.

## 3. Architecture

| Piece | Where | What |
|---|---|---|
| Admin routes | `apps/api/src/routes/admin.ts` | `/v1/admin/*`, in the OpenAPI document under the tag `admin` |
| Admin guard | `apps/api/src/http/admin.ts` | `requireAdmin` (§4) |
| Admin services | `apps/api/src/services/admin/` | look-up, metrics, actions, audit, email change |
| Shared account services | `apps/api/src/services/account.ts` | `deleteAccount`, `revokeAssistant`, `revokeSessions`: extracted from `routes/me.ts` and `routes/assistants.ts`, used by both the app's routes and the admin's |
| Emails | `apps/api/src/emails/admin.ts` | the notices of §7, es/en/it/pt |
| Config | `apps/api/src/config.ts`, `.env.example`, `deploy/personal/.env.example` | `ADMIN_USER_IDS`, `ADMIN_ALLOWED_IPS` |
| Schema | `packages/db/src/schema/domain.ts` + a drizzle migration | `admin_audit`, `admin_verification`, `email_change`, `user.suspended_at` |
| Grants | `packages/db/src/bootstrap.ts` (`grantAppRole`) | revoke UPDATE/DELETE on `admin_audit` from the runtime role |
| Web panel | `apps/web/app/admin/`, `apps/web/app/routes/admin*.tsx` | its own layout, lazy-loaded |
| Email confirmation page | `apps/web/app/routes/confirm-email.tsx` | public, under the app layout |

- `routes.ts`: the admin layout sits beside the app layout and the demo, and is left out of the
  landing-only build like the app. Caddy needs no change: `/admin` and `/confirm-email` already fall
  through to the SPA shell, `/api/v1/admin/*` to the API.
- The MCP gets no admin tool, and the Android app no admin screen. The MCP's generated types will
  contain the admin paths (they come from the same OpenAPI document); no tool calls them, and the
  guard refuses OAuth tokens anyway (§4).

## 4. Access: who can sign in, and how

### 4.1 Configuration

- `ADMIN_USER_IDS`: comma-separated Better Auth user ids. Optional; empty or unset means **no
  admins**: every `/v1/admin/*` route answers 404 and the web panel shows the not-found page.
- `ADMIN_ALLOWED_IPS`: optional comma-separated IPs or CIDR ranges. Unset means any IP. The API
  checks it against the client IP it already trusts (the single X-Forwarded-For hop Caddy sets,
  `docs/deploy/api.md`), so it works the same in direct mode (VPS) and tunnel mode (home Mac).
- Both are validated with zod at start-up like the other settings; a malformed value stops the API
  with a clear message.

### 4.2 `requireAdmin`

Every `/v1/admin/*` request goes through, in this order:

1. **A cookie session.** A bearer OAuth access token (an assistant) is refused even if its subject
   is an admin: an assistant never reaches the panel. (`requireUser`'s `grant.kind` must be
   `session`; a bearer *session* token, the mobile app's, is refused too: the panel is web only.)
2. **The user id is in `ADMIN_USER_IDS`.** Otherwise **404** `not_found`, not 403, so the panel does
   not announce itself.
3. **The IP is allowed**, when `ADMIN_ALLOWED_IPS` is set. Otherwise 404.
4. **A recent passkey verification of this session** (§4.3), less than **15 minutes** old.
   Otherwise **401** `admin_verification_required`; the panel then asks for the passkey again.

`/v1/admin/verify/*` (the verification itself) skips only step 4.

### 4.3 Passkey verification

- The panel's entry screen runs a WebAuthn assertion with **user verification required** (PIN or
  biometrics), scoped to the signed-in admin's own passkeys.
- Implementation: the API offers `POST /v1/admin/verify/options` and `POST /v1/admin/verify`,
  built on the passkey plugin's server-side verification (`@better-auth/passkey`'s authentication
  options and verification, or SimpleWebAuthn directly with the same `rpID` and origins as
  `auth.ts`, whichever the plan finds cleaner). It must not create a new session.
- On success it writes `admin_verification (session_id, verified_at)` (upsert) and the audit entry
  `admin.verified`. The row goes with the session (FK cascade), so signing out ends the
  verification.
- A session opened with an email code or magic link has no verification until a passkey assertion
  is made. An admin without a passkey cannot use the panel (the entry screen says so and links to
  settings to add one).

## 5. Actions

Every action except look-up and metrics takes a **reason** (1–300 characters; the form warns: no
personal data). An action and its audit entry are written in **one transaction**: both or neither.
Emails (§7) are sent after the commit; a failed email is logged and does not undo the action.

| # | Action | Route | Effect |
|---|---|---|---|
| 1 | Look up | `GET /v1/admin/users?email=` or `?id=` | exact match; email trimmed and lowercased |
| 2 | Change email | `POST /v1/admin/users/{id}/email-change` | sends a confirmation link to the new email |
| 3 | Delete account | `DELETE /v1/admin/users/{id}` | `deleteAccount` |
| 4a | Sign out everywhere | `POST /v1/admin/users/{id}/sessions/revoke` | deletes all its sessions |
| 4b | Revoke an assistant | `DELETE /v1/admin/users/{id}/assistants/{clientId}` | `revokeAssistant` |
| 4c | Remove a passkey | `DELETE /v1/admin/users/{id}/passkeys/{passkeyId}` | deletes that passkey |
| 5 | Suspend / reactivate | `POST /v1/admin/users/{id}/suspend`, `…/reactivate` | §5.4 |
| 6 | Metrics | `GET /v1/admin/metrics` | §6 |
| 7 | Audit | `GET /v1/admin/audit?before=&targetUserId=` | newest first, 50 per page |

An admin cannot delete or suspend their own account from the panel (409 `cannot_target_self`);
they use the app's own deletion, or another admin.

### 5.1 Look-up result

`id`, `createdAt`, `lastActiveAt` (the later of `user.lastActiveAt` and the newest session),
`isAnonymous`, `locale`, `suspendedAt`, the email, the number of sessions, the passkeys (name,
created date, device type), the connected assistants (client name, consent date). Nothing from
`accounts`, `categories`, `category_budgets`, `recurrences`, `imports`, `transactions` or
`idempotency_keys`. Not found is 404 `user_not_found`. A look-up writes no audit entry.

### 5.2 Change email

For a person who lost access to their mailbox. Proving that the requester is that person is the
admin's judgment, outside the tool; the reason records how it was checked.

1. The admin enters the new email. If another account already has it: 409 `email_taken`, nothing
   sent. Guests (no email) are refused: 409 `is_guest` (they claim one in the app).
2. The API stores `email_change (id, user_id, new_email, token_hash, expires_at, created_by)`, valid
   **24 hours**, replacing any pending one for that user, writes `email.change_requested`, and
   emails the new address a link to `/confirm-email?token=…` (only the token's hash is stored).
3. The person opens the link: the page calls `POST /v1/email-change/confirm` (public, rate-limited).
   In one transaction: the email changes (`emailVerified` true), all the user's sessions are
   deleted, the `email_change` row is deleted, `email.change_confirmed` is written. Then the old
   address gets a notice. An expired, used or unknown token: 410 `link_expired`. The email taken
   meanwhile: 409 `email_taken`.
4. The person signs in with the new email as usual.

### 5.3 Delete account

The confirm field asks for the account's email (or its id for a guest), as the app's deletion does.
`deleteAccount(db, userId)` is the code `DELETE /v1/me` runs today, moved to a service: delete the
`user` row, cascading to everything. Backups that hold it age out within 14 days (the promise in
`docs/privacy-policy.md`). The email and locale are read before the delete, to send the notice.

### 5.4 Suspend and reactivate

- New column `user.suspended_at timestamptz null` (migration; `auth.ts` declares it as an
  additional field so Better Auth does not drop it).
- Suspend, in one transaction: set `suspended_at`, delete all sessions, revoke every assistant
  (consents and tokens), audit `account.suspend`.
- While suspended: Better Auth's `databaseHooks.session.create.before` refuses a new session, so
  email-code and passkey sign-in fail with 403 `account_suspended`; `requireUser` refuses a
  still-valid OAuth access token of a suspended user the same way. The web and mobile sign-in
  screens show "Your account is suspended. Write to privacy@wambito.com." (all four languages).
- Reactivate: clear `suspended_at`, audit `account.reactivate`. The person signs in again as usual.
- The guest cleanup (`guest-cleanup.ts`) still deletes suspended guests after 60 idle days.

## 6. Metrics and the home screen

The home screen (`/admin`) shows, top first:

1. **Big number cards:** total accounts; accounts with an email; guests; active in the last 30 days
   (latest activity as in §5.1); sign-ups in the last 7 days next to the 7 before.
2. **Sign-ups per week**, the last 12 weeks (bar chart; accounts with an email and guests stacked).
3. **Suspended accounts:** the number only.
4. **The latest 50 audit entries.**
5. The look-up box.

`GET /v1/admin/metrics` returns only numbers, computed by SQL aggregates over `user` and `session`;
no user row leaves the database. Weeks are ISO weeks in UTC.

## 7. Audit log and notices

### 7.1 `admin_audit`

| Column | Type | Note |
|---|---|---|
| `id` | text (uuid) | primary key |
| `at` | timestamptz | default now |
| `admin_user_id` | text | no FK; null for `email.change_confirmed` (done by the person) |
| `action` | text | one of the list below |
| `target_user_id` | text, null | no FK: the history outlives the account |
| `email_hash` | text, null | SHA-256 of the trimmed, lowercased email, for `account.delete` and both `email.change_*` (the old address) |
| `reason` | text, null | the admin's reason |
| `detail` | jsonb, null | technical ids only: `clientId`, `passkeyId` |

Actions: `admin.verified`, `email.change_requested`, `email.change_confirmed`, `account.delete`,
`sessions.revoke`, `assistant.revoke`, `passkey.remove`, `account.suspend`, `account.reactivate`.

- **Append only:** `grantAppRole` grants as today and then revokes UPDATE and DELETE on
  `admin_audit` from the runtime role. Neither a bug nor a compromised API can rewrite history; the
  owner role (migrations, restores) still can.
- **No emails in clear.** The hash answers "did you delete the account of x@…?" by hashing the
  address and searching, without the table holding a readable list of emails.
- RLS: enabled with one policy allowing the runtime role to insert and select (the table holds no
  user's own data, and only `requireAdmin` routes read it), so the repo rule "every table has RLS"
  holds.
- `admin_verification` and `email_change` have RLS the same way; their rows cascade with the
  session and the user.

### 7.2 Emails to the affected person

In the person's locale (es/en/it/pt, beside `emails/sign-in.ts`), short, without the internal
reason, each ending with "If this wasn't you, write to privacy@wambito.com":

- the confirmation link (to the new address);
- "your email was changed" (to the old address, after confirmation);
- "your account was deleted";
- "your account was suspended" / "reactivated";
- "your sessions were signed out", "an assistant was disconnected", "a passkey was removed".

## 8. Ley 1581 guide

`docs/admin.md` (English, like the repo), short:

- Who is an admin and how to add one: find the id (the look-up, or the account's settings) and add
  it to `ADMIN_USER_IDS` in the server's `.env`, then restart the API.
- Deadlines: consultations 10 business days, claims 15 business days.
- **Consultation** ("what data do you hold about me?"): answer with the categories Wambito stores
  (the privacy policy's list); the person downloads their own data from the app's settings. The
  admin exports nothing.
- **Deletion:** check the request comes from the account's email address, delete in the panel with
  the request as reason; the answer states that backups age out within 14 days.
- **Correction:** the email change (§5.2).
- Linked from `docs/AGENTS.md` and `deploy/personal/README.md`.

## 9. Testing

Failing test first, as the repo asks.

- **Guard** (`apps/api/test`, testcontainers): empty `ADMIN_USER_IDS` → 404; non-admin → 404;
  admin with an OAuth token → refused; admin with a bearer session token → refused; IP outside
  `ADMIN_ALLOWED_IPS` → 404; verification 16 minutes old (pinned clock) → 401
  `admin_verification_required`; an email-code session without a passkey assertion → 401.
- **Verification:** a valid assertion writes `admin_verification` and `admin.verified` and creates
  no session; one for another user's passkey is refused.
- **Each action:** does what it says, writes exactly one audit entry with the right fields, sends
  its email (Mailpit or the test mailer); when the action fails, no audit entry stays.
- **Shared services:** the existing `DELETE /v1/me` and assistant-revoke tests pass unchanged.
- **Suspension:** a suspended user cannot sign in by code or passkey, and their still-valid OAuth
  token is refused; reactivation lets them in.
- **Email change:** the link works once; it expires at 24 hours; the email taken meanwhile → 409;
  confirming signs out every session.
- **Self-target:** deleting or suspending oneself → 409.
- **Database** (`packages/db`): the runtime role's UPDATE and DELETE on `admin_audit` fail.
- **Boundary:** a test reads the imports of `apps/api/src/services/admin/**` and
  `routes/admin.ts` and fails if any finance table of `domain.ts` appears.
- **Web:** unit and Storybook tests for the panel's screens and `/confirm-email`; one e2e: a seeded
  admin (the seed gives `dev@wambito.test` a fixed id, and the e2e stack sets `ADMIN_USER_IDS` to
  it) registers and uses a passkey through Playwright's virtual WebAuthn authenticator, looks up a
  seeded user, suspends them, and sees the entry in the audit list.

## 10. Languages

- The panel: Spanish and English, in its own message files `admin.{es,en}.json`, outside the
  four-language parity check (its operators read one of the two; `messages.test.ts` learns the
  exception).
- `/confirm-email`, the suspended message and the emails: all four languages.

## 11. Out of scope, on purpose

- Impersonating a user; showing, exporting or editing finance data; any count of it.
- A list of all users, or partial-match search.
- Admin roles or permissions (every admin can do everything).
- A request tracker with deadlines (the reason field holds the request reference).
- Admin tools in the MCP or the Android app; a CLI.
- Opening sign-up (removing `SIGN_IN_ALLOWLIST`): a separate step after the panel works in
  production.

## 12. Rollout

- Merging to `main` deploys, but the panel arrives **off**: `ADMIN_USER_IDS` is empty by default.
- To turn it on: the founder's account has a passkey; their id goes into `ADMIN_USER_IDS` in the
  VPS `.env`; the API restarts. Then a dry run on a test account (suspend, reactivate, delete).
- Docs: `apps/api/AGENTS.md` (admin routes, guard, config), `apps/web/AGENTS.md` (the admin layout,
  its messages), `packages/db/AGENTS.md` (`admin_audit` is append-only), `docs/admin.md`,
  `.env.example` files. Generated API types for web and MCP are regenerated (CI diffs them).
