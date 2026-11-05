import { createRoute } from "@hono/zod-openapi";
import { withUser } from "@wambito/db";
import type { AppDeps } from "../deps.ts";
import { idempotent } from "../http/idempotency.ts";
import { jsonBody, jsonResponse, problems } from "../http/openapi.ts";
import { router } from "../http/router.ts";
import { CaptureResult, CreateCapture, idempotencyKeyHeader } from "../http/schemas.ts";
import { saveCapture } from "../services/captures.ts";

export function captureRoutes(deps: AppDeps) {
  const app = router();

  // A retried capture must answer as the first did, so the key is mandatory.
  app.use("/v1/captures", idempotent(deps.db, { required: true }));

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/captures",
      operationId: "createCapture",
      description:
        "Saves a purchase parsed from a bank notification, to review. The same purchase seen again (same kind, amount and currency within 10 minutes of `capturedAt`) is not saved twice: the answer is `merged`. `Idempotency-Key` is required.",
      request: {
        headers: idempotencyKeyHeader({ required: true }),
        body: jsonBody(CreateCapture),
      },
      responses: {
        200: jsonResponse(CaptureResult, "Already saved (`merged`): nothing was written"),
        201: jsonResponse(CaptureResult, "Saved (`created`)"),
        ...problems(400, 422),
      },
    }),
    async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user");
      const { status, body } = await withUser(deps.db, user.id, (tx) =>
        saveCapture(tx, user, input),
      );
      return c.json(body, status);
    },
  );

  return app;
}
