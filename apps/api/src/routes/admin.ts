import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { adminAudit } from "@wambito/db";
import { and, desc, eq, lt } from "@wambito/db/orm";
import type { Auth } from "../auth.ts";
import type { AppDeps } from "../deps.ts";
import type { AdminEnv } from "../env.ts";
import { ADMIN_VERIFY_MS, requireAdmin } from "../http/admin.ts";
import { jsonBody, jsonResponse, problems } from "../http/openapi.ts";
import { ApiError, notFound, validationHook } from "../http/problem.ts";
import { lookupUser } from "../services/admin/lookup.ts";
import { adminMetrics } from "../services/admin/metrics.ts";
import { adminVerifyOptions, verifyAdminAssertion } from "../services/admin/verify.ts";

/** The reason an admin gives for an action (spec §5): required, 1–300 characters. */
export const reasonField = z.string().trim().min(1).max(300);

const tags = ["admin"];

const AdminMe = z
  .object({
    id: z.string(),
    /** When this session's passkey verification runs out (ISO 8601). */
    verifiedUntil: z.string(),
  })
  .openapi("AdminMe");

const AdminUser = z
  .object({
    id: z.string(),
    /** `null` for a guest. */
    email: z.string().nullable(),
    isAnonymous: z.boolean(),
    locale: z.string(),
    createdAt: z.string(),
    lastActiveAt: z.string().nullable(),
    suspendedAt: z.string().nullable(),
    sessionCount: z.number().int(),
    passkeys: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        deviceType: z.string(),
        createdAt: z.string().nullable(),
      }),
    ),
    assistants: z.array(
      z.object({ clientId: z.string(), name: z.string(), consentedAt: z.string() }),
    ),
  })
  .openapi("AdminUser");

const AdminMetrics = z
  .object({
    total: z.number().int(),
    withEmail: z.number().int(),
    guests: z.number().int(),
    active30d: z.number().int(),
    suspended: z.number().int(),
    signups7d: z.number().int(),
    signupsPrev7d: z.number().int(),
    weekly: z.array(
      z.object({
        /** Monday of the ISO week (UTC), YYYY-MM-DD. */
        weekStart: z.string(),
        withEmail: z.number().int(),
        guests: z.number().int(),
      }),
    ),
  })
  .openapi("AdminMetrics");

const AuditEntry = z
  .object({
    id: z.string(),
    at: z.string(),
    adminUserId: z.string().nullable(),
    action: z.string(),
    targetUserId: z.string().nullable(),
    emailHash: z.string().nullable(),
    reason: z.string().nullable(),
    detail: z.record(z.string(), z.string()).nullable(),
  })
  .openapi("AdminAuditEntry");

const AuditPage = z
  .object({
    entries: z.array(AuditEntry),
    /** Pass as `before` for the next page; `null` at the end. */
    next: z.string().nullable(),
  })
  .openapi("AdminAuditPage");

const AUDIT_PAGE = 50;

const Credential = z.object({
  id: z.string(),
  type: z.literal("public-key"),
  transports: z.array(z.string()).optional(),
});

/** WebAuthn request options, as `navigator.credentials.get` takes them (in their JSON form). */
const PasskeyRequestOptions = z
  .object({
    challenge: z.string(),
    timeout: z.number().optional(),
    rpId: z.string().optional(),
    allowCredentials: z.array(Credential).optional(),
    userVerification: z.string().optional(),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("PasskeyRequestOptions");

/** A WebAuthn assertion in its JSON form (SimpleWebAuthn's `AuthenticationResponseJSON`). */
const PasskeyAssertion = z
  .object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
    clientExtensionResults: z.record(z.string(), z.unknown()),
  })
  .openapi("PasskeyAssertion");

/**
 * The admin panel's API (spec §4–§7). Mounted before `requireUser` (app.ts), so every request is
 * judged by `requireAdmin` alone: a refused one gets the same 404 as a path that does not exist.
 */
export function adminRoutes(deps: AppDeps, auth: Auth) {
  const app = new OpenAPIHono<AdminEnv>({ defaultHook: validationHook });
  const signedIn = requireAdmin(auth, deps, { verified: false });
  const verified = requireAdmin(auth, deps, { verified: true });

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/admin/verify/options",
      operationId: "adminVerifyOptions",
      tags,
      middleware: [signedIn] as const,
      responses: {
        200: jsonResponse(PasskeyRequestOptions, "Options for a passkey assertion"),
        ...problems(404),
      },
    }),
    async (c) => {
      const options = await adminVerifyOptions(deps, c.get("adminId"), c.get("sessionId"));
      return c.json(options, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/admin/verify",
      operationId: "adminVerify",
      tags,
      middleware: [signedIn] as const,
      request: { body: jsonBody(PasskeyAssertion) },
      responses: {
        204: { description: "This session is verified for the next 15 minutes" },
        ...problems(400, 404, 422),
      },
    }),
    async (c) => {
      const assertion = c.req.valid("json") as AuthenticationResponseJSON;
      await verifyAdminAssertion(deps, c.get("adminId"), c.get("sessionId"), assertion);
      return c.body(null, 204);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/admin/me",
      operationId: "getAdminMe",
      tags,
      middleware: [verified] as const,
      responses: {
        200: jsonResponse(AdminMe, "The signed-in, verified admin"),
        ...problems(401, 404),
      },
    }),
    (c) => {
      const verifiedAt = c.get("adminVerifiedAt") ?? new Date(0);
      return c.json(
        {
          id: c.get("adminId"),
          verifiedUntil: new Date(verifiedAt.getTime() + ADMIN_VERIFY_MS).toISOString(),
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/admin/users",
      operationId: "adminLookupUser",
      tags,
      middleware: [verified] as const,
      request: {
        query: z
          .object({ email: z.string().min(1).optional(), id: z.string().min(1).optional() })
          .refine((q) => (q.email === undefined) !== (q.id === undefined), {
            message: "Give exactly one of email or id",
          }),
      },
      responses: {
        200: jsonResponse(AdminUser, "The account"),
        ...problems(401, 404, 422),
      },
    }),
    async (c) => {
      const q = c.req.valid("query");
      const found = await lookupUser(
        deps.db,
        q.email !== undefined ? { email: q.email } : { id: q.id ?? "" },
      );
      if (!found) throw new ApiError(404, "user_not_found", "No account matches");
      return c.json(found, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/admin/metrics",
      operationId: "getAdminMetrics",
      tags,
      middleware: [verified] as const,
      responses: {
        200: jsonResponse(AdminMetrics, "Account counts and sign-ups per week"),
        ...problems(401, 404),
      },
    }),
    async (c) => {
      const now = (deps.now ?? (() => new Date()))();
      return c.json(await adminMetrics(deps.db, now), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/v1/admin/audit",
      operationId: "listAdminAudit",
      tags,
      middleware: [verified] as const,
      request: {
        query: z.object({
          before: z.string().datetime({ offset: true }).optional(),
          targetUserId: z.string().min(1).optional(),
        }),
      },
      responses: {
        200: jsonResponse(AuditPage, "The audit log, newest first"),
        ...problems(401, 404, 422),
      },
    }),
    async (c) => {
      const { before, targetUserId } = c.req.valid("query");
      const rows = await deps.db
        .select()
        .from(adminAudit)
        .where(
          and(
            before ? lt(adminAudit.at, new Date(before)) : undefined,
            targetUserId ? eq(adminAudit.targetUserId, targetUserId) : undefined,
          ),
        )
        .orderBy(desc(adminAudit.at), desc(adminAudit.id))
        .limit(AUDIT_PAGE + 1);
      const page = rows.slice(0, AUDIT_PAGE);
      const entries = page.map((r) => ({
        id: r.id,
        at: r.at.toISOString(),
        adminUserId: r.adminUserId,
        action: r.action,
        targetUserId: r.targetUserId,
        emailHash: r.emailHash,
        reason: r.reason,
        detail: (r.detail as Record<string, string> | null) ?? null,
      }));
      const last = entries.at(-1);
      return c.json({ entries, next: rows.length > AUDIT_PAGE && last ? last.at : null }, 200);
    },
  );

  // Any other admin path: the same 404, before `requireUser` could answer 401 for it.
  app.all("/v1/admin/*", (c) => notFound(c));

  return app;
}
