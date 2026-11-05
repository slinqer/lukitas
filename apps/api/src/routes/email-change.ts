import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { type Db, rateLimit } from "@wambito/db";
import { sql } from "@wambito/db/orm";
import { isSignInAllowed } from "../auth.ts";
import type { AppDeps } from "../deps.ts";
import { clientIp } from "../http/client-ip.ts";
import { jsonBody, problems } from "../http/openapi.ts";
import { ApiError, validationHook } from "../http/problem.ts";
import { confirmEmailChange } from "../services/admin/email-change.ts";
import { nowOf } from "../services/time.ts";

/** Confirm attempts per client address and window, like Better Auth's own per-IP limits. */
export const CONFIRM_LIMIT = { max: 10, windowMs: 10 * 60 * 1000 };

const ConfirmBody = z.object({ token: z.string().min(1).max(200) }).openapi("EmailChangeConfirm");

/**
 * Counts one confirm attempt for `ip` in Better Auth's `rate_limit` table (under a key of our own,
 * `email-change-confirm|<ip>`; `last_request` holds when the key's window opened, in ms) and says
 * whether it goes over the limit. Requests without a trusted address share one bucket. Real time,
 * not the pinned clock: the limit protects the live server.
 */
async function overConfirmLimit(db: Db, ip: string | null): Promise<boolean> {
  const key = `email-change-confirm|${ip ?? "unknown"}`;
  const now = Date.now();
  const windowOpen = now - CONFIRM_LIMIT.windowMs;
  const [row] = await db
    .insert(rateLimit)
    .values({ id: key, key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        lastRequest: sql`case when ${rateLimit.lastRequest} < ${windowOpen} then ${now} else ${rateLimit.lastRequest} end`,
        count: sql`case when ${rateLimit.lastRequest} < ${windowOpen} then 1 else ${rateLimit.count} + 1 end`,
      },
    })
    .returning({ count: rateLimit.count });
  return (row?.count ?? 1) > CONFIRM_LIMIT.max;
}

/**
 * The public end of an admin's email change (spec §5.2): the `/confirm-email` page posts the
 * link's token here. Mounted before `requireUser` (app.ts): the person is usually signed out.
 */
export function emailChangeRoutes(deps: AppDeps) {
  const app = new OpenAPIHono({ defaultHook: validationHook });

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/email-change/confirm",
      operationId: "confirmEmailChange",
      request: { body: jsonBody(ConfirmBody) },
      responses: {
        204: { description: "The email changed; every session was signed out" },
        ...problems(409, 410, 422, 429),
      },
    }),
    async (c) => {
      if (await overConfirmLimit(deps.db, clientIp(c.req.raw.headers, deps.config))) {
        c.header("retry-after", String(CONFIRM_LIMIT.windowMs / 1000));
        throw new ApiError(429, "too_many_requests", "Too many attempts; try again later");
      }
      const { token } = c.req.valid("json");
      await confirmEmailChange(
        {
          db: deps.db,
          mailer: deps.mailer,
          webUrl: deps.config.WEB_URL,
          now: nowOf(deps),
          signInAllowed: (email) => isSignInAllowed(deps.config, email),
        },
        token,
      );
      return c.body(null, 204);
    },
  );

  return app;
}
