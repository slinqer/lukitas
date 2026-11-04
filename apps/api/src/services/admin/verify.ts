import { randomUUID } from "node:crypto";
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { adminVerification, passkey, verification } from "@wambito/db";
import { and, eq } from "@wambito/db/orm";
import { passkeyOrigins } from "../../auth.ts";
import type { AppDeps } from "../../deps.ts";
import { ApiError } from "../../http/problem.ts";
import { recordAudit } from "./audit.ts";

/** How long the challenge of an admin passkey verification stays usable. */
export const ADMIN_CHALLENGE_MS = 5 * 60 * 1000;

/** The challenge's row in Better Auth's `verification` table: one per session. */
const challengeId = (sessionId: string) => `admin-verify:${sessionId}`;

const clock = (deps: AppDeps) => (deps.now ?? (() => new Date()))();

/** The relying party id the passkeys were made for: the web host (as auth.ts tells the plugin). */
const rpId = (deps: AppDeps) => new URL(deps.config.WEB_URL).hostname;

/** Every failed assertion looks the same to the caller, and writes nothing but the used challenge. */
const failed = () =>
  new ApiError(400, "passkey_verification_failed", "The passkey could not be verified");

const transportsOf = (value: string | null) =>
  value ? (value.split(",") as AuthenticatorTransportFuture[]) : undefined;

/**
 * WebAuthn request options for the admin's own passkeys, with user verification required (spec
 * §4.3). The challenge is kept for this session only, replacing any earlier one.
 */
export async function adminVerifyOptions(
  deps: AppDeps,
  adminId: string,
  sessionId: string,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const keys = await deps.db
    .select({ credentialID: passkey.credentialID, transports: passkey.transports })
    .from(passkey)
    .where(eq(passkey.userId, adminId));
  const options = await generateAuthenticationOptions({
    rpID: rpId(deps),
    userVerification: "required",
    allowCredentials: keys.map((k) => ({
      id: k.credentialID,
      transports: transportsOf(k.transports),
    })),
  });
  const identifier = challengeId(sessionId);
  await deps.db.transaction(async (tx) => {
    await tx.delete(verification).where(eq(verification.identifier, identifier));
    await tx.insert(verification).values({
      id: randomUUID(),
      identifier,
      value: options.challenge,
      expiresAt: new Date(clock(deps).getTime() + ADMIN_CHALLENGE_MS),
    });
  });
  return options;
}

/**
 * Checks an assertion against this session's challenge and one of the admin's own passkeys, as
 * `@better-auth/passkey`'s verify-authentication does but with user verification required and
 * without creating a session. The challenge is used up whatever the outcome. On success it moves
 * the passkey's counter on, marks the session verified now (`admin_verification`, upsert) and
 * records `admin.verified`, in one transaction.
 */
export async function verifyAdminAssertion(
  deps: AppDeps,
  adminId: string,
  sessionId: string,
  response: AuthenticationResponseJSON,
): Promise<void> {
  const now = clock(deps);
  const [challenge] = await deps.db
    .delete(verification)
    .where(eq(verification.identifier, challengeId(sessionId)))
    .returning();
  if (!challenge || challenge.expiresAt.getTime() <= now.getTime()) throw failed();

  const [key] = await deps.db
    .select()
    .from(passkey)
    .where(and(eq(passkey.credentialID, response.id), eq(passkey.userId, adminId)));
  if (!key) throw failed();

  let newCounter: number;
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.value,
      expectedOrigin: passkeyOrigins(deps.config),
      expectedRPID: rpId(deps),
      credential: {
        id: key.credentialID,
        publicKey: new Uint8Array(Buffer.from(key.publicKey, "base64")),
        counter: key.counter,
        transports: transportsOf(key.transports),
      },
      requireUserVerification: true,
    });
    if (!result.verified) throw failed();
    newCounter = result.authenticationInfo.newCounter;
  } catch {
    throw failed();
  }

  await deps.db.transaction(async (tx) => {
    await tx.update(passkey).set({ counter: newCounter }).where(eq(passkey.id, key.id));
    await tx
      .insert(adminVerification)
      .values({ sessionId, verifiedAt: now })
      .onConflictDoUpdate({ target: adminVerification.sessionId, set: { verifiedAt: now } });
    await recordAudit(tx, { adminUserId: adminId, action: "admin.verified" });
  });
}
