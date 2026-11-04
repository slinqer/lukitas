import { type Db, oauthClient, oauthConsent, passkey, type Tx, user } from "@wambito/db";
import { and, eq, isNotNull, isNull, sql } from "@wambito/db/orm";
import { type AdminMailExtra, type AdminMailKind, adminMail } from "../../emails/admin.ts";
import { ApiError } from "../../http/problem.ts";
import type { Mailer } from "../../mailer.ts";
import { deleteAccount, revokeAllAssistants, revokeAssistant, revokeSessions } from "../account.ts";
import { emailHash, recordAudit } from "./audit.ts";

/** Who acts, why, and how to tell the person (spec §5, §7). */
export interface ActionContext {
  db: Db;
  mailer: Mailer;
  webUrl: string;
  adminId: string;
  reason: string;
}

export interface Target {
  id: string;
  email: string;
  isAnonymous: boolean;
  locale: string;
}

/** The account, read before the action: the notice goes to this email, in this locale. */
export async function target(db: Db | Tx, userId: string): Promise<Target> {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      isAnonymous: user.isAnonymous,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (!row) throw new ApiError(404, "user_not_found", "No account matches");
  return { ...row, isAnonymous: row.isAnonymous ?? false };
}

function notSelf(ctx: ActionContext, userId: string) {
  if (userId === ctx.adminId) {
    throw new ApiError(409, "cannot_target_self", "Use the app's own settings, or another admin");
  }
}

/**
 * Mails the notice after the commit. A guest has no real address (its placeholder is under
 * `.invalid`), so it gets nothing. A failed send is logged: the action stays done.
 */
export async function notify(
  ctx: Pick<ActionContext, "mailer" | "webUrl">,
  to: Target,
  kind: AdminMailKind,
  extra: Omit<AdminMailExtra, "webUrl"> = {},
) {
  if (to.isAnonymous || /\.invalid\.?$/i.test(to.email.trim())) return;
  try {
    await ctx.mailer.send({
      to: to.email,
      ...adminMail(kind, to.locale, { ...extra, webUrl: ctx.webUrl }),
    });
  } catch (err) {
    console.error(`admin notice ${kind} for ${to.id} failed`, err);
  }
}

/**
 * Deletes the account (`deleteAccount`). `confirm` is the account's email (trimmed, any case), or
 * its id for a guest; anything else is 400 and nothing happens. The audit keeps the email's hash.
 */
export async function deleteUser(ctx: ActionContext, userId: string, confirm: string) {
  notSelf(ctx, userId);
  const who = await target(ctx.db, userId);
  const expected = who.isAnonymous ? who.id : who.email.trim().toLowerCase();
  const given = who.isAnonymous ? confirm.trim() : confirm.trim().toLowerCase();
  if (given !== expected) {
    throw new ApiError(400, "bad_request", "The confirmation does not match the account");
  }
  await ctx.db.transaction(async (tx) => {
    if (!(await deleteAccount(tx, userId))) {
      throw new ApiError(404, "user_not_found", "No account matches");
    }
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "account.delete",
      targetUserId: userId,
      emailHash: emailHash(who.email),
      reason: ctx.reason,
    });
  });
  await notify(ctx, who, "account_deleted");
}

/** Signs the person out everywhere. */
export async function signOutEverywhere(ctx: ActionContext, userId: string) {
  const who = await target(ctx.db, userId);
  await ctx.db.transaction(async (tx) => {
    await revokeSessions(tx, userId);
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "sessions.revoke",
      targetUserId: userId,
      reason: ctx.reason,
    });
  });
  await notify(ctx, who, "sessions_revoked");
}

/** Disconnects one assistant (`revokeAssistant`); 404 when the person has not connected it. */
export async function disconnectAssistant(ctx: ActionContext, userId: string, clientId: string) {
  const who = await target(ctx.db, userId);
  const [client] = await ctx.db
    .select({ name: oauthClient.name })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)));
  await ctx.db.transaction(async (tx) => {
    if (!(await revokeAssistant(tx, userId, clientId))) {
      throw new ApiError(404, "not_found", "This account has not connected that assistant");
    }
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "assistant.revoke",
      targetUserId: userId,
      reason: ctx.reason,
      detail: { clientId },
    });
  });
  await notify(ctx, who, "assistant_revoked", { assistant: client?.name ?? undefined });
}

/** Deletes one of the person's passkeys; 404 when it is not theirs. */
export async function removePasskey(ctx: ActionContext, userId: string, passkeyId: string) {
  const who = await target(ctx.db, userId);
  const removed = await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .delete(passkey)
      .where(and(eq(passkey.id, passkeyId), eq(passkey.userId, userId)))
      .returning({ name: passkey.name });
    if (!row) throw new ApiError(404, "not_found", "This account has no such passkey");
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "passkey.remove",
      targetUserId: userId,
      reason: ctx.reason,
      detail: { passkeyId },
    });
    return row;
  });
  await notify(ctx, who, "passkey_removed", { passkey: removed.name ?? undefined });
}

/**
 * Suspends the account (spec §5.4), in one transaction: `suspended_at`, every session, every
 * assistant, the audit entry. An account already suspended is a no-op: its sessions and
 * assistants are cleared again (harmless), but nothing is audited or mailed.
 */
export async function suspendUser(ctx: ActionContext, userId: string) {
  notSelf(ctx, userId);
  const who = await target(ctx.db, userId);
  const changed = await ctx.db.transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ suspendedAt: sql`now()` })
      .where(and(eq(user.id, userId), isNull(user.suspendedAt)))
      .returning({ id: user.id });
    await revokeSessions(tx, userId);
    await revokeAllAssistants(tx, userId);
    if (rows.length === 0) return false;
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "account.suspend",
      targetUserId: userId,
      reason: ctx.reason,
    });
    return true;
  });
  if (changed) await notify(ctx, who, "account_suspended");
}

/**
 * Lifts a suspension; the person signs in again as usual. An account that is not suspended is a
 * no-op: nothing is audited or mailed.
 */
export async function reactivateUser(ctx: ActionContext, userId: string) {
  const who = await target(ctx.db, userId);
  const changed = await ctx.db.transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ suspendedAt: null })
      .where(and(eq(user.id, userId), isNotNull(user.suspendedAt)))
      .returning({ id: user.id });
    if (rows.length === 0) return false;
    await recordAudit(tx, {
      adminUserId: ctx.adminId,
      action: "account.reactivate",
      targetUserId: userId,
      reason: ctx.reason,
    });
    return true;
  });
  if (changed) await notify(ctx, who, "account_reactivated");
}
