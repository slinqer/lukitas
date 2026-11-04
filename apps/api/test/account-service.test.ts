import { oauthAccessToken, oauthConsent, oauthRefreshToken, session, user } from "@wambito/db";
import { eq } from "@wambito/db/orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  deleteAccount,
  revokeAllAssistants,
  revokeAssistant,
  revokeSessions,
} from "../src/services/account.ts";
import { createTestApp, type TestApp } from "./harness.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t?.stop());

const count = async (table: typeof session | typeof oauthConsent, userId: string) =>
  (await t.admin.select().from(table).where(eq(table.userId, userId))).length;

async function connected(email: string, clients: number) {
  const { userId, headers } = await t.signIn(email);
  const clientIds: string[] = [];
  for (let i = 0; i < clients; i++) {
    clientIds.push((await t.authorize(email, { headers })).clientId);
  }
  return { userId, clientIds };
}

describe("revokeSessions", () => {
  test("deletes every session of the user, returns the count, leaves others", async () => {
    const a = await t.signIn("sessions-a@wambito.test");
    await t.signIn("sessions-a@wambito.test");
    const b = await t.signIn("sessions-b@wambito.test");
    const before = await count(session, a.userId);
    expect(before).toBeGreaterThanOrEqual(2);
    expect(await revokeSessions(t.admin, a.userId)).toBe(before);
    expect(await count(session, a.userId)).toBe(0);
    expect(await count(session, b.userId)).toBe(1);
    expect(await revokeSessions(t.admin, a.userId)).toBe(0);
  });
});

describe("revokeAllAssistants", () => {
  test("removes every consent and token of the user and counts the consents", async () => {
    const a = await connected("all-a@wambito.test", 2);
    const b = await connected("all-b@wambito.test", 1);
    const removed = await t.admin.transaction((tx) => revokeAllAssistants(tx, a.userId));
    expect(removed).toBe(2);
    expect(await count(oauthConsent, a.userId)).toBe(0);
    expect(
      await t.admin.select().from(oauthRefreshToken).where(eq(oauthRefreshToken.userId, a.userId)),
    ).toEqual([]);
    expect(
      await t.admin.select().from(oauthAccessToken).where(eq(oauthAccessToken.userId, a.userId)),
    ).toEqual([]);
    expect(await count(oauthConsent, b.userId)).toBe(1);
    expect(await t.admin.transaction((tx) => revokeAllAssistants(tx, a.userId))).toBe(0);
  });
});

describe("revokeAssistant", () => {
  test("removes one client's consent, true; false when there is none", async () => {
    const a = await connected("one-a@wambito.test", 2);
    const [first, second] = a.clientIds as [string, string];
    expect(await revokeAssistant(t.admin, a.userId, first)).toBe(true);
    expect(await count(oauthConsent, a.userId)).toBe(1);
    expect(await revokeAssistant(t.admin, a.userId, first)).toBe(false);
    expect(await revokeAssistant(t.admin, "nobody", second)).toBe(false);
    expect(await count(oauthConsent, a.userId)).toBe(1);
  });
});

describe("deleteAccount", () => {
  test("deletes the user, true; false when no row; others untouched", async () => {
    const a = await t.signIn("del-a@wambito.test");
    const b = await t.signIn("del-b@wambito.test");
    expect(await deleteAccount(t.admin, a.userId)).toBe(true);
    expect(await deleteAccount(t.admin, a.userId)).toBe(false);
    expect(await count(session, a.userId)).toBe(0);
    expect(await t.admin.select().from(user).where(eq(user.id, b.userId))).toHaveLength(1);
  });
});
