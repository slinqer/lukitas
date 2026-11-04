import { type Db, oauthClient, oauthConsent, passkey, session, user } from "@wambito/db";
import { desc, eq, max, sql } from "@wambito/db/orm";

/** What the look-up shows about an account (spec §5.1): nothing from the finance tables. */
export interface AdminUserView {
  id: string;
  /** `null` for a guest, whose address is a placeholder. */
  email: string | null;
  isAnonymous: boolean;
  locale: string;
  createdAt: string;
  /** The later of `user.lastActiveAt` and the newest session; `null` if neither exists. */
  lastActiveAt: string | null;
  suspendedAt: string | null;
  sessionCount: number;
  passkeys: { id: string; name: string | null; deviceType: string; createdAt: string | null }[];
  assistants: { clientId: string; name: string; consentedAt: string }[];
}

/** Finds one account by its exact email (trimmed, lowercased) or by its id. */
export async function lookupUser(
  db: Db,
  by: { email: string } | { id: string },
): Promise<AdminUserView | null> {
  const where =
    "email" in by ? eq(user.email, by.email.trim().toLowerCase()) : eq(user.id, by.id.trim());
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      isAnonymous: user.isAnonymous,
      locale: user.locale,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      suspendedAt: user.suspendedAt,
    })
    .from(user)
    .where(where);
  if (!row) return null;

  const [sessions] = await db
    .select({
      count: sql<number>`count(*)::int`,
      newest: max(session.updatedAt),
    })
    .from(session)
    .where(eq(session.userId, row.id));
  const passkeys = await db
    .select({
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      createdAt: passkey.createdAt,
    })
    .from(passkey)
    .where(eq(passkey.userId, row.id))
    .orderBy(desc(passkey.createdAt));
  const assistants = await db
    .select({
      clientId: oauthConsent.clientId,
      name: oauthClient.name,
      consentedAt: oauthConsent.createdAt,
    })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .where(eq(oauthConsent.userId, row.id))
    .orderBy(desc(oauthConsent.createdAt));

  const times = [row.lastActiveAt, sessions?.newest].filter((d): d is Date => d != null);
  const latest = times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
  return {
    id: row.id,
    email: row.isAnonymous ? null : row.email,
    isAnonymous: row.isAnonymous,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: latest?.toISOString() ?? null,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    sessionCount: sessions?.count ?? 0,
    passkeys: passkeys.map((p) => ({ ...p, createdAt: p.createdAt?.toISOString() ?? null })),
    assistants: assistants.map((a) => ({
      clientId: a.clientId,
      name: a.name ?? a.clientId,
      consentedAt: a.consentedAt.toISOString(),
    })),
  };
}
