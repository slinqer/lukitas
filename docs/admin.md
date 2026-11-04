# Admin panel and data-subject requests

The admin panel is how the operator answers a person's rights under Colombia's Ley 1581 (access,
correction, deletion) and handles the rare account problem. Design: `docs/superpowers/specs/2026-11-04-admin-panel-design.md`.
It is off until an admin is configured.

## Who is an admin

An admin is a Wambito account whose user id is listed in `ADMIN_USER_IDS` (comma-separated) in the
server's `.env`. Empty or unset means no admins: every admin route answers 404 and the web panel
shows the not-found page.

To add one:

1. The account needs a passkey (the panel asks for it before every session of work, and again
   after 15 minutes). Add it in the app's settings.
2. Find the account's id: in the panel's look-up (by email), or in the account's settings.
3. Put the id in `ADMIN_USER_IDS` in `deploy/personal/.env` on the server.
4. Apply it: from `deploy/personal`, `docker compose up -d api` (a plain `restart` keeps the old
   environment).

An assistant (an OAuth token) and the mobile app never reach the panel: it is a web session only.

### Limiting by address (optional)

`ADMIN_ALLOWED_IPS` is a comma-separated list of IPs or CIDR ranges, for example
`203.0.113.7,198.51.100.0/24`. When set, the panel answers 404 to any other address. Unset, any
address may try. It uses the client address the API already trusts (`docs/deploy/api.md`).

## Deadlines (Ley 1581)

- Consultation ("what data do you hold about me?"): answer within **10 business days**.
- Claim (correction, deletion): answer within **15 business days**.

Requests arrive at `privacy@wambito.com`. Write down when each one arrived.

## Procedures

Every action asks for a reason (1 to 300 characters, no personal data) and is written to the audit
log together with the action.

- **Consultation.** Answer with the categories of data Wambito stores (the list in
  `docs/privacy-policy.md`). The person downloads their own data from the app's settings. The admin
  exports nothing.
- **Deletion.** Check the request comes from the email address of the account. Delete the account in
  the panel and write the request as the reason. In the answer, say that backups age out within 14
  days.
- **Correction.** For a wrong or unreachable email, use the panel's email change: it sends a
  confirmation link to the new address, valid 24 hours. Proving the requester is the account's
  owner is the admin's judgment; the reason records how it was checked. Other data the person
  corrects in the app.
- **Account problems.** Sign out everywhere, revoke an assistant or remove a passkey from the same
  screen. Suspend blocks sign-in and ends sessions and assistants until you reactivate it.

An admin cannot delete or suspend their own account from the panel.

## Dry run

After turning the panel on, and before the first real request, try it on a test account made for
that purpose (never a real person's account):

1. Look the test account up by email.
2. Suspend it with a reason; confirm it can no longer sign in.
3. Reactivate it; confirm it signs in again.
4. Delete it; confirm the look-up no longer finds it, and that the audit log shows the three
   actions.
