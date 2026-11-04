import { createHash } from "node:crypto";
import { adminAudit, type Db, type Tx } from "@wambito/db";

/** What an admin did (spec §7.1); the panel and the audit list show these names. */
export type AuditAction =
  | "admin.verified"
  | "email.change_requested"
  | "email.change_confirmed"
  | "account.delete"
  | "sessions.revoke"
  | "assistant.revoke"
  | "passkey.remove"
  | "account.suspend"
  | "account.reactivate";

/**
 * An email address as the audit keeps it: the SHA-256 (hex) of the trimmed, lowercased address,
 * so "did you delete x@…?" is answered by hashing and searching, without a list of emails in clear.
 */
export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Appends one entry to `admin_audit` (the runtime role can only insert and read it). Pass the
 * action's transaction, so the entry is written exactly when the action is. `detail` holds
 * technical ids only (`clientId`, `passkeyId`).
 */
export async function recordAudit(
  tx: Db | Tx,
  entry: {
    adminUserId: string | null;
    action: AuditAction;
    targetUserId?: string;
    emailHash?: string;
    reason?: string;
    detail?: Record<string, string>;
  },
): Promise<void> {
  await tx.insert(adminAudit).values({
    adminUserId: entry.adminUserId,
    action: entry.action,
    targetUserId: entry.targetUserId ?? null,
    emailHash: entry.emailHash ?? null,
    reason: entry.reason ?? null,
    detail: entry.detail ?? null,
  });
}
