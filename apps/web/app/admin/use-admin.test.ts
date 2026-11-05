import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../api/client.ts";
import { ApiProblem } from "../api/errors.ts";
import { type AdminDeps, createAdminSession } from "./use-admin.ts";

const BASE = "http://localhost/api";
const UNTIL = "2026-11-04T10:15:00.000Z";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const problem = (status: number, code: string) =>
  new Response(JSON.stringify({ type: "about:blank", title: code, status, code }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });

const OPTIONS = {
  challenge: "c2FtcGxl",
  rpId: "wambito.test",
  userVerification: "required",
  allowCredentials: [{ id: "cred-1", type: "public-key" }],
};

const ASSERTION = {
  id: "cred-1",
  rawId: "cred-1",
  type: "public-key",
  response: { clientDataJSON: "e30", authenticatorData: "AA", signature: "AA" },
  clientExtensionResults: {},
} as const;

type Handler = (request: Request) => Response | Promise<Response>;

/** A fake API: one handler per "METHOD /path", answering 404 for anything else. */
function fakeApi(handlers: Record<string, Handler>) {
  const calls: string[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input as Request;
    const key = `${request.method} ${new URL(request.url).pathname.replace("/api", "")}`;
    calls.push(key);
    const handler = handlers[key];
    return handler ? handler(request) : problem(404, "not_found");
  });
  const client = createApiClient({ fetch, baseUrl: BASE, onUnauthorized: vi.fn() });
  return { client, calls, fetch };
}

function session(
  handlers: Record<string, Handler>,
  authenticate: AdminDeps["authenticate"] = async () => ASSERTION,
) {
  const api = fakeApi(handlers);
  return { ...api, admin: createAdminSession({ client: api.client, authenticate }) };
}

describe("the admin session", () => {
  it("starts loading, and is ready with the verification's end for a verified admin", async () => {
    const { admin } = session({
      "GET /v1/admin/me": () => json(200, { id: "a", verifiedUntil: UNTIL }),
    });
    expect(admin.getSnapshot().state).toBe("loading");
    await admin.load();
    expect(admin.getSnapshot()).toMatchObject({ state: "ready", verifiedUntil: new Date(UNTIL) });
  });

  it("knows the admin's own account id once ready (own account: no delete or suspend)", async () => {
    const { admin } = session({
      "GET /v1/admin/me": () => json(200, { id: "admin-1", verifiedUntil: UNTIL }),
    });
    await admin.load();
    expect(admin.getSnapshot().adminId).toBe("admin-1");
  });

  it("is not_found when the API answers 404 (not an admin, or no admins at all)", async () => {
    const { admin } = session({});
    await admin.load();
    expect(admin.getSnapshot().state).toBe("not_found");
  });

  it("needs verification on a 401 admin_verification_required", async () => {
    const { admin } = session({
      "GET /v1/admin/me": () => problem(401, "admin_verification_required"),
    });
    await admin.load();
    expect(admin.getSnapshot().state).toBe("needs_verification");
  });

  it("keeps any other failure as the error, for the route's error boundary", async () => {
    const { admin } = session({ "GET /v1/admin/me": () => problem(500, "internal_error") });
    await expect(admin.load()).rejects.toBeInstanceOf(ApiProblem);
    expect(admin.getSnapshot().error).toMatchObject({ code: "internal_error" });
  });

  it("tells its listeners when the state moves", async () => {
    const { admin } = session({});
    const listener = vi.fn();
    const stop = admin.subscribe(listener);
    await admin.load();
    expect(listener).toHaveBeenCalled();
    stop();
  });
});

describe("adminFetch", () => {
  it("passes a successful call straight through", async () => {
    const { admin } = session({});
    await expect(admin.adminFetch(async () => 42)).resolves.toBe(42);
  });

  it("holds a call that meets a 401, retries it once after verify(), and resolves with it", async () => {
    let verified = false;
    const { admin, calls } = session({
      "GET /v1/admin/me": () =>
        verified
          ? json(200, { id: "a", verifiedUntil: UNTIL })
          : problem(401, "admin_verification_required"),
      "GET /v1/admin/metrics": () =>
        verified ? json(200, { weeks: [] }) : problem(401, "admin_verification_required"),
      "POST /v1/admin/verify/options": () => json(200, OPTIONS),
      "POST /v1/admin/verify": () => {
        verified = true;
        return new Response(null, { status: 204 });
      },
    });
    const call = vi.fn(async () => {
      const { data } = await admin.client.GET("/v1/admin/metrics");
      return data;
    });
    const pending = admin.adminFetch(call);
    await vi.waitFor(() => expect(admin.getSnapshot().state).toBe("needs_verification"));
    expect(call).toHaveBeenCalledTimes(1);

    await admin.verify();
    await expect(pending).resolves.toEqual({ weeks: [] });
    expect(call).toHaveBeenCalledTimes(2);
    expect(admin.getSnapshot()).toMatchObject({ state: "ready", verifiedUntil: new Date(UNTIL) });
    expect(calls).toContain("POST /v1/admin/verify");
  });

  it("rejects the held call when the verification is cancelled", async () => {
    const { admin } = session({
      "GET /v1/admin/metrics": () => problem(401, "admin_verification_required"),
    });
    const pending = admin.adminFetch(() => admin.client.GET("/v1/admin/metrics"));
    await vi.waitFor(() => expect(admin.getSnapshot().state).toBe("needs_verification"));
    admin.cancel();
    await expect(pending).rejects.toMatchObject({ code: "admin_verification_required" });
  });

  it("lets every other failure through unchanged", async () => {
    const { admin } = session({ "GET /v1/admin/users": () => problem(404, "user_not_found") });
    await expect(
      admin.adminFetch(() =>
        admin.client.GET("/v1/admin/users", { params: { query: { email: "x@example.com" } } }),
      ),
    ).rejects.toMatchObject({ code: "user_not_found" });
    expect(admin.getSnapshot().state).toBe("loading");
  });
});

describe("verify", () => {
  const needsVerification = {
    "GET /v1/admin/me": () => problem(401, "admin_verification_required"),
  };

  it("does not open the browser's prompt for an admin with no passkey", async () => {
    const authenticate = vi.fn(async () => ASSERTION);
    const { admin, calls } = session(
      {
        ...needsVerification,
        "POST /v1/admin/verify/options": () => json(200, { ...OPTIONS, allowCredentials: [] }),
      },
      authenticate,
    );
    await admin.load();
    await admin.verify();
    expect(authenticate).not.toHaveBeenCalled();
    expect(calls).not.toContain("POST /v1/admin/verify");
    expect(admin.getSnapshot()).toMatchObject({
      state: "needs_verification",
      verification: "no_passkey",
    });
  });

  it("asks for the passkey with the API's options and user verification", async () => {
    const authenticate = vi.fn(async () => ASSERTION);
    const { admin, fetch } = session(
      {
        ...needsVerification,
        "POST /v1/admin/verify/options": () => json(200, OPTIONS),
        "POST /v1/admin/verify": () => new Response(null, { status: 204 }),
      },
      authenticate,
    );
    await admin.load();
    await admin.verify();
    expect(authenticate).toHaveBeenCalledWith(OPTIONS);
    const sent = fetch.mock.calls
      .map(([request]) => request as Request)
      .find((request) => new URL(request.url).pathname.endsWith("/v1/admin/verify"));
    expect(await sent?.json()).toEqual(ASSERTION);
  });

  it("shows a refused assertion as failed, still waiting for a passkey", async () => {
    const { admin } = session({
      ...needsVerification,
      "POST /v1/admin/verify/options": () => json(200, OPTIONS),
      "POST /v1/admin/verify": () => problem(400, "passkey_verification_failed"),
    });
    await admin.load();
    await admin.verify();
    expect(admin.getSnapshot()).toMatchObject({
      state: "needs_verification",
      verification: "failed",
    });
  });

  it("takes closing the browser's prompt quietly: back to idle, nothing sent", async () => {
    const closed = Object.assign(new Error("closed"), { name: "NotAllowedError" });
    const { admin, calls } = session(
      { ...needsVerification, "POST /v1/admin/verify/options": () => json(200, OPTIONS) },
      async () => {
        throw closed;
      },
    );
    await admin.load();
    await admin.verify();
    expect(calls).not.toContain("POST /v1/admin/verify");
    expect(admin.getSnapshot()).toMatchObject({
      state: "needs_verification",
      verification: "idle",
    });
  });

  it("back to idle when the API still asks for verification after a passkey it accepted", async () => {
    const { admin } = session({
      ...needsVerification,
      "POST /v1/admin/verify/options": () => json(200, OPTIONS),
      "POST /v1/admin/verify": () => new Response(null, { status: 204 }),
    });
    await admin.load();
    await admin.verify();
    expect(admin.getSnapshot()).toMatchObject({
      state: "needs_verification",
      verification: "idle",
    });
  });

  it("a failed session check after the passkey: verify() resolves, the error is kept, not busy", async () => {
    let me = 0;
    const { admin } = session({
      "GET /v1/admin/me": () =>
        ++me === 1 ? problem(401, "admin_verification_required") : problem(500, "internal_error"),
      "POST /v1/admin/verify/options": () => json(200, OPTIONS),
      "POST /v1/admin/verify": () => new Response(null, { status: 204 }),
    });
    await admin.load();
    await expect(admin.verify()).resolves.toBeUndefined();
    expect(admin.getSnapshot().error).toMatchObject({ code: "internal_error" });
    expect(admin.getSnapshot().verification).toBe("idle");
  });

  it("is busy while the passkey is asked for, and ignores a second tap", async () => {
    let finish: (value: typeof ASSERTION) => void = () => {};
    const authenticate = vi.fn(
      () =>
        new Promise<typeof ASSERTION>((resolve) => {
          finish = resolve;
        }),
    );
    const { admin } = session(
      {
        ...needsVerification,
        "POST /v1/admin/verify/options": () => json(200, OPTIONS),
        "POST /v1/admin/verify": () => new Response(null, { status: 204 }),
      },
      authenticate,
    );
    await admin.load();
    const first = admin.verify();
    const second = admin.verify();
    await vi.waitFor(() => expect(authenticate).toHaveBeenCalledOnce());
    expect(admin.getSnapshot().verification).toBe("busy");
    finish(ASSERTION);
    await Promise.all([first, second]);
    expect(authenticate).toHaveBeenCalledOnce();
  });
});
