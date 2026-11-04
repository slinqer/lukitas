import { adminAudit, adminVerification, emailThrottle, passkey, session, user } from "@wambito/db";
import { count, eq } from "@wambito/db/orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { createTestApp, type TestApp } from "./harness.ts";
import { createSoftPasskey } from "./soft-passkey.ts";

const ADMIN_ID = "admin-user-id";
const ADMIN_EMAIL = "admin@wambito.test";
const RP_ID = "localhost";
const MINUTE = 60 * 1000;

type Headers = Record<string, string>;
type SoftPasskey = Awaited<ReturnType<typeof createSoftPasskey>>;

/** The admin's user, created up front so its id can be in ADMIN_USER_IDS when the app starts. */
async function seedAdmin(t: TestApp) {
  await t.admin
    .insert(user)
    .values({ id: ADMIN_ID, name: "Admin", email: ADMIN_EMAIL, emailVerified: true });
}

/** Every admin route, so the "not found" cases cover them all (and an unknown admin path). */
const ADMIN_ROUTES: [string, string][] = [
  ["GET", "/v1/admin/me"],
  ["POST", "/v1/admin/verify/options"],
  ["POST", "/v1/admin/verify"],
  ["POST", "/v1/admin/users/some-id/email-change"],
  ["GET", "/v1/admin/nothing-here"],
];

async function expectNotFoundEverywhere(t: TestApp, headers: Headers) {
  for (const [method, path] of ADMIN_ROUTES) {
    const res = await t.request(method, path, {
      headers,
      ...(method === "POST" ? { body: {} } : {}),
    });
    expect({ path, status: res.status }).toEqual({ path, status: 404 });
    expect(((await res.json()) as { code: string }).code).toBe("not_found");
  }
}

async function sessionIdOf(t: TestApp, headers: Headers): Promise<string> {
  const res = await t.request("GET", "/auth/get-session", { headers });
  return ((await res.json()) as { session: { id: string } }).session.id;
}

async function auditCount(t: TestApp) {
  const [row] = await t.admin.select({ n: count() }).from(adminAudit);
  return row?.n ?? 0;
}

describe("no admins configured", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await seedAdmin(t);
  });
  afterAll(() => t?.stop());

  test("no admins configured → 404 on every admin route", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    await expectNotFoundEverywhere(t, headers);
    await expectNotFoundEverywhere(t, {});
  });
});

describe("requireAdmin", () => {
  let t: TestApp;
  let clock = new Date();
  let adminKey: SoftPasskey;

  beforeAll(async () => {
    t = await createTestApp({ ADMIN_USER_IDS: [ADMIN_ID] }, { now: () => clock });
    await seedAdmin(t);
    adminKey = await createSoftPasskey(t.admin, ADMIN_ID, RP_ID);
  });
  afterAll(() => t?.stop());
  beforeEach(async () => {
    clock = new Date();
    // Every test signs the admin in again; the per-address email limit is not under test here.
    await t.admin.delete(emailThrottle);
  });

  async function options(headers: Headers) {
    const res = await t.request("POST", "/v1/admin/verify/options", { headers });
    expect(res.status).toBe(200);
    return (await res.json()) as {
      challenge: string;
      rpId: string;
      userVerification: string;
      allowCredentials: { id: string }[];
    };
  }

  async function verify(headers: Headers, key: SoftPasskey) {
    const assertion = key.assert(await options(headers), t.config.WEB_URL);
    return t.request("POST", "/v1/admin/verify", { headers, body: assertion });
  }

  test("an unauthenticated request → 404", async () => {
    await expectNotFoundEverywhere(t, {});
  });

  test("a signed-in non-admin → 404", async () => {
    const { headers } = await t.signInCookie("someone@wambito.test");
    await expectNotFoundEverywhere(t, headers);
  });

  test("an admin with an assistant's OAuth token → 404", async () => {
    const { accessToken } = await t.authorize(ADMIN_EMAIL);
    await expectNotFoundEverywhere(t, { authorization: `Bearer ${accessToken}` });
  });

  test("an admin with a bearer session token → 404", async () => {
    const { userId, headers } = await t.signIn(ADMIN_EMAIL);
    expect(userId).toBe(ADMIN_ID);
    await expectNotFoundEverywhere(t, headers);
  });

  test("a cookie plus an authorization header → 404", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    await expectNotFoundEverywhere(t, { ...headers, authorization: "Bearer whatever" });
  });

  test("an admin with an email-code session and no verification → 401 admin_verification_required", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const res = await t.request("GET", "/v1/admin/me", { headers });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe("admin_verification_required");
  });

  test("the options ask for user verification with the admin's own passkeys", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const opts = await options(headers);
    expect(opts.rpId).toBe(RP_ID);
    expect(opts.userVerification).toBe("required");
    expect(opts.allowCredentials.map((c) => c.id)).toEqual([adminKey.credentialId]);
    expect(opts.challenge.length).toBeGreaterThan(20);
  });

  test("a valid passkey assertion verifies: 204, admin_verification row, one admin.verified audit row, no new session row", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const sessionId = await sessionIdOf(t, headers);
    const [sessionsBefore] = await t.admin.select({ n: count() }).from(session);
    const auditBefore = await auditCount(t);

    const res = await verify(headers, adminKey);
    expect(res.status).toBe(204);

    const rows = await t.admin
      .select()
      .from(adminVerification)
      .where(eq(adminVerification.sessionId, sessionId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.verifiedAt.getTime()).toBe(clock.getTime());
    expect(await auditCount(t)).toBe(auditBefore + 1);
    const [audit] = await t.admin
      .select()
      .from(adminAudit)
      .where(eq(adminAudit.action, "admin.verified"));
    expect(audit).toMatchObject({ adminUserId: ADMIN_ID, action: "admin.verified" });
    const [sessionsAfter] = await t.admin.select({ n: count() }).from(session);
    expect(sessionsAfter?.n).toBe(sessionsBefore?.n);
    expect(res.headers.get("set-cookie")).toBeNull();

    const [stored] = await t.admin
      .select({ counter: passkey.counter })
      .from(passkey)
      .where(eq(passkey.credentialID, adminKey.credentialId));
    expect(stored?.counter).toBeGreaterThan(0);

    const me = await t.request("GET", "/v1/admin/me", { headers });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({
      id: ADMIN_ID,
      verifiedUntil: new Date(clock.getTime() + 15 * MINUTE).toISOString(),
    });
  });

  test("an assertion with another user's passkey → 400, nothing written", async () => {
    await t.admin
      .insert(user)
      .values({ id: "other-user-id", name: "Other", email: "other@wambito.test" });
    const otherKey = await createSoftPasskey(t.admin, "other-user-id", RP_ID);
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const sessionId = await sessionIdOf(t, headers);
    const auditBefore = await auditCount(t);

    const res = await verify(headers, otherKey);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("passkey_verification_failed");
    expect(
      await t.admin
        .select()
        .from(adminVerification)
        .where(eq(adminVerification.sessionId, sessionId)),
    ).toEqual([]);
    expect(await auditCount(t)).toBe(auditBefore);
    const [stored] = await t.admin
      .select({ counter: passkey.counter })
      .from(passkey)
      .where(eq(passkey.credentialID, otherKey.credentialId));
    expect(stored?.counter).toBe(0);
  });

  test("an assertion without a challenge, or reusing a used one → 400", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const forged = adminKey.assert({ challenge: "bm90LWEtcmVhbC1jaGFsbGVuZ2U" }, t.config.WEB_URL);
    const res = await t.request("POST", "/v1/admin/verify", { headers, body: forged });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("passkey_verification_failed");

    const assertion = adminKey.assert(await options(headers), t.config.WEB_URL);
    const first = await t.request("POST", "/v1/admin/verify", { headers, body: assertion });
    expect(first.status).toBe(204);
    const replay = await t.request("POST", "/v1/admin/verify", { headers, body: assertion });
    expect(replay.status).toBe(400);
  });

  test("an assertion from another origin → 400", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const assertion = adminKey.assert(await options(headers), "https://evil.example");
    const res = await t.request("POST", "/v1/admin/verify", { headers, body: assertion });
    expect(res.status).toBe(400);
  });

  test("verification 16 minutes old → 401; 14 minutes old → 200 on GET /v1/admin/me", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    const verifiedAt = clock;
    expect((await verify(headers, adminKey)).status).toBe(204);

    clock = new Date(verifiedAt.getTime() + 14 * MINUTE);
    expect((await t.request("GET", "/v1/admin/me", { headers })).status).toBe(200);

    clock = new Date(verifiedAt.getTime() + 16 * MINUTE);
    const stale = await t.request("GET", "/v1/admin/me", { headers });
    expect(stale.status).toBe(401);
    expect(((await stale.json()) as { code: string }).code).toBe("admin_verification_required");
  });
});

describe("ADMIN_ALLOWED_IPS", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ ADMIN_USER_IDS: [ADMIN_ID], ADMIN_ALLOWED_IPS: ["203.0.113.0/24"] });
    await seedAdmin(t);
  });
  afterAll(() => t?.stop());

  test("an admin from an IP outside ADMIN_ALLOWED_IPS → 404", async () => {
    const { headers } = await t.signInCookie(ADMIN_EMAIL);
    await expectNotFoundEverywhere(t, headers);

    // From inside the range the guard goes on to ask for the passkey.
    const inside = await t.request("GET", "/v1/admin/me", {
      headers: { ...headers, "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(inside.status).toBe(401);
  });
});
