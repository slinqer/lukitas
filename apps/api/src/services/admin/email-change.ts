import { createHash, randomBytes } from "node:crypto";
import { type Db, emailChange, type Tx, user } from "@wambito/db";
import { and, eq, gt, ne, sql } from "@wambito/db/orm";
import { isUniqueViolation } from "../../http/db-errors.ts";
import { ApiError } from "../../http/problem.ts";
import { revokeSessions } from "../account.ts";
import { type ActionContext, notify, target } from "./actions.ts";
import { emailHash, recordAudit } from "./audit.ts";

/** How long a confirmation link works (spec §5.2). */
export const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

/** The stored form of a link's token: SHA-256, hex. The raw token only travels in the email. */
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

const emailTaken = () => new ApiError(409, "email_taken", "That email already has an account");
const linkExpired = () =>
  new ApiError(410, "link_expired", "This link has expired or was already used");

/** Whether an account other than `userId` already has `email` (already trimmed + lowercased). */
async function takenByOther(db: Db | Tx, email: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(sql`lower(${user.email}) = ${email}`, ne(user.id, userId)))
    .limit(1);
  return row !== undefined;
}

/**
 * Starts an email change (spec §5.2): a one-day link to `newEmail` (trimmed and lowercased by the
 * caller), replacing any pending one, and the `email.change_requested` audit entry, in one
 * transaction. The link is mailed after the commit.
 */
export async function requestEmailChange(
  ctx: ActionContext & { now: Date },
  userId: string,
  newEmail: string,
) {
  const who = await target(ctx.db, userId);
  if (who.isAnonymous) {
    throw new ApiError(409, "is_guest", "A guest has no email; they claim one in the app");
  }
  if (await takenByOther(ctx.db, newEmail, userId)) throw emailTaken();
  const token = randomBytes(32).toString("base64url");
  const values = {
    newEmail,
    tokenHash: tokenHash(token),
    expiresAt: new Date(ctx.now.getTime() + EMAIL_CHANGE_TTL_MS),
    createdBy: ctx.adminId,
  };
  await ctx.db.transaction(async (tx) => {
    await tx
      .insert(emailChange)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: emailChange.userId,
        set: { ...values, createdAt: sql`now()` },
      });
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "email.change_requested",
      targetUserId: userId,
      emailHash: emailHash(who.email),
      reason: ctx.reason,
    });
  });
  const link = `${ctx.webUrl}/confirm-email?token=${encodeURIComponent(token)}`;
  await notify(ctx, { ...who, email: newEmail }, "email_change_link", { link });
}

/**
 * The person confirms the link (spec §5.2), in one transaction: the pending row is deleted first
 * (so of two concurrent confirms only one gets it), the email changes and counts as verified,
 * every session ends, `email.change_confirmed` is written. Then the old address gets a notice.
 * An unknown, used or expired token: 410 `link_expired`; the email taken meanwhile: 409.
 */
export async function confirmEmailChange(
  ctx: Pick<ActionContext, "db" | "mailer" | "webUrl"> & { now: Date },
  token: string,
) {
  const old = await ctx.db.transaction(async (tx) => {
    const [change] = await tx
      .delete(emailChange)
      .where(and(eq(emailChange.tokenHash, tokenHash(token)), gt(emailChange.expiresAt, ctx.now)))
      .returning();
    if (!change) throw linkExpired();
    const [row] = await tx
      .select({
        id: user.id,
        email: user.email,
        isAnonymous: user.isAnonymous,
        locale: user.locale,
      })
      .from(user)
      .where(eq(user.id, change.userId))
      .for("update");
    if (!row) throw linkExpired();
    if (await takenByOther(tx, change.newEmail, change.userId)) throw emailTaken();
    try {
      await tx
        .update(user)
        .set({ email: change.newEmail, emailVerified: true })
        .where(eq(user.id, change.userId));
    } catch (err) {
      if (isUniqueViolation(err)) throw emailTaken();
      throw err;
    }
    await revokeSessions(tx, change.userId);
    await recordAudit(tx, {
      adminUserId: null,
      action: "email.change_confirmed",
      targetUserId: change.userId,
      emailHash: emailHash(row.email),
    });
    return { ...row, isAnonymous: row.isAnonymous ?? false };
  });
  await notify(ctx, old, "email_changed");
}
