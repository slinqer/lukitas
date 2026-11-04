import { adminVerification } from "@wambito/db";
import { eq } from "@wambito/db/orm";
import { createMiddleware } from "hono/factory";
import type { Auth } from "../auth.ts";
import type { AppDeps } from "../deps.ts";
import type { AdminEnv } from "../env.ts";
import { clientIp, ipAllowed } from "./client-ip.ts";
import { ApiError } from "./problem.ts";

/** How long a passkey verification lets an admin session use the panel (spec §4.2). */
export const ADMIN_VERIFY_MS = 15 * 60 * 1000;

/** The guard's refusals before verification: the panel does not announce itself. */
const notFound = () => new ApiError(404, "not_found");

/**
 * The guard of every `/v1/admin/*` route (spec §4.2), in this order:
 *
 * 1. a cookie session: a request with an `authorization` header is refused, which turns away both
 *    an assistant's OAuth token and the app's bearer session token (the panel is web only);
 * 2. the user id is in ADMIN_USER_IDS;
 * 3. the client IP is in ADMIN_ALLOWED_IPS, when that is set;
 * 4. with `verified`, a passkey verification of this session less than ADMIN_VERIFY_MS old
 *    (clock: `deps.now`).
 *
 * The first three answer 404 `not_found`; the fourth 401 `admin_verification_required`. Sets
 * `adminId`, `sessionId` and `adminVerifiedAt`.
 */
export function requireAdmin(auth: Auth, deps: AppDeps, { verified }: { verified: boolean }) {
  return createMiddleware<AdminEnv>(async (c, next) => {
    const { config } = deps;
    const headers = c.req.raw.headers;
    if (config.ADMIN_USER_IDS.length === 0) throw notFound();
    if (headers.has("authorization")) throw notFound();
    const result = await auth.api.getSession({ headers });
    if (!result) throw notFound();
    const adminId = result.user.id;
    if (!config.ADMIN_USER_IDS.includes(adminId)) throw notFound();
    if (config.ADMIN_ALLOWED_IPS && !ipAllowed(clientIp(headers, config), config.ADMIN_ALLOWED_IPS))
      throw notFound();

    const sessionId = result.session.id;
    let verifiedAt: Date | null = null;
    if (verified) {
      const [row] = await deps.db
        .select({ verifiedAt: adminVerification.verifiedAt })
        .from(adminVerification)
        .where(eq(adminVerification.sessionId, sessionId));
      const now = (deps.now ?? (() => new Date()))().getTime();
      const age = row ? now - row.verifiedAt.getTime() : Number.POSITIVE_INFINITY;
      if (!row || age >= ADMIN_VERIFY_MS || age < 0)
        throw new ApiError(401, "admin_verification_required", "Confirm it is you with a passkey");
      verifiedAt = row.verifiedAt;
    }
    c.set("adminId", adminId);
    c.set("sessionId", sessionId);
    c.set("adminVerifiedAt", verifiedAt);
    await next();
  });
}
