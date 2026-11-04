import { emailThrottle, user } from "@wambito/db";
import type { TestApp } from "./harness.ts";
import { createSoftPasskey } from "./soft-passkey.ts";

export const ADMIN_ID = "admin-user-id";
export const ADMIN_EMAIL = "admin@wambito.test";
const RP_ID = "localhost";

/**
 * Creates the admin's user and a software passkey for it. Call it before the app's first request,
 * on an app started with `ADMIN_USER_IDS: [ADMIN_ID]`.
 */
export async function seedAdmin(t: TestApp) {
  await t.admin
    .insert(user)
    .values({ id: ADMIN_ID, name: "Admin", email: ADMIN_EMAIL, emailVerified: true });
  return createSoftPasskey(t.admin, ADMIN_ID, RP_ID);
}

/**
 * Signs the admin in with the email code (a cookie session) and verifies that session with the
 * passkey: the headers that open `/v1/admin/*` routes that need verification.
 */
export async function verifiedAdmin(
  t: TestApp,
  key: Awaited<ReturnType<typeof seedAdmin>>,
  email = ADMIN_EMAIL,
): Promise<{ cookie: string }> {
  // Tests sign the admin in many times; the per-address email limit is not under test.
  await t.admin.delete(emailThrottle);
  const { headers } = await t.signInCookie(email);
  const optionsRes = await t.request("POST", "/v1/admin/verify/options", { headers });
  if (optionsRes.status !== 200) throw new Error(`verify options: ${optionsRes.status}`);
  const options = (await optionsRes.json()) as { challenge: string };
  const res = await t.request("POST", "/v1/admin/verify", {
    headers,
    body: key.assert(options, t.config.WEB_URL),
  });
  if (res.status !== 204) throw new Error(`verify: ${res.status} ${await res.text()}`);
  return headers;
}
