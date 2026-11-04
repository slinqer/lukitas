import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  adminAudit,
  adminVerification,
  createDb,
  type Db,
  emailChange,
  session,
  user,
} from "../src/index.ts";
import { startTestDatabase } from "../src/testing.ts";

let stop: () => Promise<void>;
let admin: { db: Db; close(): Promise<void> };
let app: { db: Db; close(): Promise<void> };

beforeAll(async () => {
  const database = await startTestDatabase();
  stop = database.stop;
  admin = createDb(database.adminUrl);
  app = createDb(database.appUrl);
}, 120_000);

afterAll(async () => {
  await app?.close();
  await admin?.close();
  await stop?.();
});

describe("admin tables", () => {
  test("the app role can insert and select admin_audit", async () => {
    const [row] = await app.db
      .insert(adminAudit)
      .values({ action: "admin.verified", reason: "check" })
      .returning();
    expect(row?.id).toBeTruthy();
    const rows = await app.db
      .select()
      .from(adminAudit)
      .where(eq(adminAudit.id, row?.id ?? ""));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe("admin.verified");
  });

  test("the app role cannot update or delete admin_audit", async () => {
    const [row] = await app.db.insert(adminAudit).values({ action: "account.delete" }).returning();
    const id = row?.id ?? "";
    // drizzle wraps the driver error; the Postgres message is on `cause`.
    const denied = { cause: { message: expect.stringMatching(/permission denied/) } };
    await expect(
      app.db.update(adminAudit).set({ reason: "x" }).where(eq(adminAudit.id, id)),
    ).rejects.toMatchObject(denied);
    await expect(app.db.delete(adminAudit).where(eq(adminAudit.id, id))).rejects.toMatchObject(
      denied,
    );
  });

  test("admin_audit rows outlive the user", async () => {
    await admin.db.insert(user).values({ id: "audit-u", name: "A", email: "audit-u@wambito.test" });
    const [row] = await app.db
      .insert(adminAudit)
      .values({ action: "account.delete", targetUserId: "audit-u" })
      .returning();
    await admin.db.delete(user).where(eq(user.id, "audit-u"));
    const rows = await admin.db
      .select()
      .from(adminAudit)
      .where(eq(adminAudit.id, row?.id ?? ""));
    expect(rows).toHaveLength(1);
  });

  test("admin_verification and email_change cascade", async () => {
    await admin.db.insert(user).values({ id: "cas-u", name: "C", email: "cas-u@wambito.test" });
    await admin.db.insert(session).values({
      id: "cas-s",
      token: "cas-token",
      userId: "cas-u",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await app.db.insert(adminVerification).values({ sessionId: "cas-s", verifiedAt: new Date() });
    await app.db.insert(emailChange).values({
      id: "cas-e",
      userId: "cas-u",
      newEmail: "new@wambito.test",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: "admin-1",
    });

    await admin.db.delete(session).where(eq(session.id, "cas-s"));
    expect(await admin.db.select().from(adminVerification)).toHaveLength(0);

    await admin.db.delete(user).where(eq(user.id, "cas-u"));
    expect(await admin.db.select().from(emailChange)).toHaveLength(0);
  });
});
