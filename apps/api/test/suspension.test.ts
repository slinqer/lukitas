import { emailThrottle, session, user } from "@wambito/db";
import { count, eq } from "@wambito/db/orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { codeFrom, createTestApp, type TestApp } from "./harness.ts";
import { createSoftPasskey } from "./soft-passkey.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t?.stop());
beforeEach(async () => {
  // Several tests sign the same address in; the per-address email limit is not under test here.
  await t.admin.delete(emailThrottle);
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Sets `suspended_at` directly, as the admin's suspend will (without its revocations). */
async function suspend(userId: string) {
  await t.admin.update(user).set({ suspendedAt: new Date() }).where(eq(user.id, userId));
}

async function reactivate(userId: string) {
  await t.admin.update(user).set({ suspendedAt: null }).where(eq(user.id, userId));
}

async function sessionCount(userId: string) {
  const [row] = await t.admin
    .select({ n: count() })
    .from(session)
    .where(eq(session.userId, userId));
  return row?.n ?? 0;
}

/** The email-code sign-in, answering whatever the server says (the harness's helper throws). */
async function signInByCode(email: string): Promise<Response> {
  const sent = await t.request("POST", "/auth/email-otp/send-verification-otp", {
    body: { email, type: "sign-in" },
  });
  expect(sent.status).toBe(200);
  const mail = t.mailer.lastTo(email);
  if (!mail) throw new Error("no sign-in mail");
  return t.request("POST", "/auth/sign-in/email-otp", {
    body: { email, otp: codeFrom(mail.subject) },
  });
}

async function expectSuspended(res: Response) {
  expect(res.status).toBe(403);
  expect(((await res.json()) as { code: string }).code).toBe("account_suspended");
}

describe("a suspended account", () => {
  test("a suspended user cannot sign in by email code → 403 account_suspended", async () => {
    const { userId } = await t.signIn("code@wambito.test");
    await t.admin.delete(session).where(eq(session.userId, userId));
    await suspend(userId);

    await expectSuspended(await signInByCode("code@wambito.test"));
    expect(await sessionCount(userId)).toBe(0);
  });

  test("a suspended user cannot sign in with a passkey → 403 account_suspended", async () => {
    const { userId } = await t.signIn("passkey@wambito.test");
    const key = await createSoftPasskey(t.admin, userId, "localhost");
    await t.admin.delete(session).where(eq(session.userId, userId));
    await suspend(userId);

    const options = await t.request("GET", "/auth/passkey/generate-authenticate-options");
    expect(options.status).toBe(200);
    const cookie = options.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const challenge = (await options.json()) as { challenge: string };
    const res = await t.request("POST", "/auth/passkey/verify-authentication", {
      headers: { cookie, origin: t.config.WEB_URL },
      body: { response: key.assert(challenge, t.config.WEB_URL) },
    });
    await expectSuspended(res);
    expect(await sessionCount(userId)).toBe(0);
  });

  test("a suspended user's still-valid session token → 403 account_suspended", async () => {
    const { userId, headers } = await t.signIn("session@wambito.test");
    await suspend(userId);

    await expectSuspended(await t.request("GET", "/v1/categories", { headers }));
  });

  test("a suspended user's existing OAuth access token → 403", async () => {
    const { userId } = await t.signIn("oauth@wambito.test");
    const { accessToken } = await t.authorize("oauth@wambito.test");
    await suspend(userId);

    await expectSuspended(
      await t.request("GET", "/v1/categories", { headers: bearer(accessToken) }),
    );
  });

  test("a suspended user's refresh token is refused", async () => {
    const { userId } = await t.signIn("refresh@wambito.test");
    const tokens = await t.authorize("refresh@wambito.test");
    await suspend(userId);

    const res = await t.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: tokens.clientId,
    });
    expect(res.status).not.toBe(200);
    expect(((await res.json()) as { code?: string }).code).toBe("account_suspended");
  });

  test("clearing suspended_at lets them sign in", async () => {
    const { userId } = await t.signIn("back@wambito.test");
    const tokens = await t.authorize("back@wambito.test");
    await suspend(userId);
    await expectSuspended(await signInByCode("back@wambito.test"));

    await reactivate(userId);
    const res = await signInByCode("back@wambito.test");
    expect(res.status).toBe(200);
    const token = res.headers.get("set-auth-token") ?? "";
    expect((await t.request("GET", "/v1/categories", { headers: bearer(token) })).status).toBe(200);
    const refreshed = await t.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: tokens.clientId,
    });
    expect(refreshed.status).toBe(200);
  });

  test("an account that is not suspended refreshes as usual", async () => {
    const tokens = await t.authorize("fine@wambito.test");
    const res = await t.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: tokens.clientId,
    });
    expect(res.status).toBe(200);
  });
});
