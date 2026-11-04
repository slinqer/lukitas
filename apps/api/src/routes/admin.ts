import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import type { Auth } from "../auth.ts";
import type { AppDeps } from "../deps.ts";
import type { AdminEnv } from "../env.ts";
import { ADMIN_VERIFY_MS, requireAdmin } from "../http/admin.ts";
import { jsonBody, jsonResponse, problems } from "../http/openapi.ts";
import { notFound, validationHook } from "../http/problem.ts";
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

  // Any other admin path: the same 404, before `requireUser` could answer 401 for it.
  app.all("/v1/admin/*", (c) => notFound(c));

  return app;
}
