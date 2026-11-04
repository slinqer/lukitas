import {
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import { createContext, useContext, useSyncExternalStore } from "react";
import { ADMIN_VERIFICATION_REQUIRED, type ApiClient } from "../api/client.ts";
import { ApiProblem } from "../api/errors.ts";
import type { components } from "../api/schema";

/**
 * The admin panel's session (spec §4): whether the signed-in person may use the panel, and the
 * passkey verification it asks for every 15 minutes.
 *
 * - `loading`: `GET /v1/admin/me` has not answered yet;
 * - `not_found`: it answered 404 (not an admin, a disallowed IP, or no admins at all): the panel
 *   does not announce itself, so the layout shows the ordinary not-found page;
 * - `needs_verification`: 401 `admin_verification_required`, now or on any later call;
 * - `ready`: verified until `verifiedUntil`.
 *
 * Signed out also answers 404 here; the layout finds a signed-out visitor with the app's own
 * session check first (`requireSession`) and sends them to sign-in.
 */
export type AdminState = "loading" | "not_found" | "needs_verification" | "ready";

/** Where the passkey step stands: `no_passkey` is an admin with none to confirm with. */
export type VerificationStatus = "idle" | "busy" | "failed" | "no_passkey";

export interface AdminSnapshot {
  state: AdminState;
  verifiedUntil?: Date;
  /** The signed-in admin's own account id (`GET /v1/admin/me`), once known. */
  adminId?: string;
  verification: VerificationStatus;
  /** A failure that is none of the above (no connection, a 5xx): the route's error boundary shows it. */
  error?: unknown;
}

export type PasskeyRequestOptions = components["schemas"]["PasskeyRequestOptions"];
export type PasskeyAssertion = components["schemas"]["PasskeyAssertion"];

export interface AdminDeps {
  /** The app's API client (`useApi()`): cookies only, no `authorization` header. */
  client: ApiClient;
  /** The browser's passkey prompt; it rejects when the person closes it. */
  authenticate(options: PasskeyRequestOptions): Promise<PasskeyAssertion>;
}

export interface AdminSession {
  client: ApiClient;
  getSnapshot(): AdminSnapshot;
  subscribe(listener: () => void): () => void;
  /** Asks `GET /v1/admin/me` where the session stands. */
  load(): Promise<void>;
  /**
   * Runs an admin call. A 401 `admin_verification_required` does not reach the caller: the panel
   * moves to `needs_verification` and the call waits, to be retried once after `verify()`
   * succeeds (resolving with that retry's answer), or rejected by `cancel()`.
   */
  adminFetch<T>(call: () => Promise<T>): Promise<T>;
  /**
   * Confirms with a passkey: options, the browser's prompt, the assertion. It never rejects: a
   * failure shows as `verification` or as the snapshot's `error`.
   */
  verify(): Promise<void>;
  /** Gives up on the verification: every waiting call rejects with its 401. */
  cancel(): void;
}

interface Waiting {
  call: () => Promise<unknown>;
  problem: ApiProblem;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

const needsVerification = (error: unknown): error is ApiProblem =>
  error instanceof ApiProblem && error.status === 401 && error.code === ADMIN_VERIFICATION_REQUIRED;

/**
 * Closing the browser's prompt, or letting it time out: browsers report both as `NotAllowedError`
 * (SimpleWebAuthn passes it through), an abort as `AbortError`. Not a failure worth a message.
 */
function closedPrompt(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === "NotAllowedError" || name === "AbortError" || code === "ERROR_CEREMONY_ABORTED";
}

export function createAdminSession({ client, authenticate }: AdminDeps): AdminSession {
  let snapshot: AdminSnapshot = { state: "loading", verification: "idle" };
  const listeners = new Set<() => void>();
  let waiting: Waiting[] = [];
  let verifying: Promise<void> | null = null;

  function set(next: Partial<AdminSnapshot>) {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  }

  async function load() {
    try {
      const { data } = await client.GET("/v1/admin/me");
      set({
        state: "ready",
        ...(data?.id ? { adminId: data.id } : {}),
        verifiedUntil: new Date(data?.verifiedUntil ?? 0),
        verification: "idle",
      });
    } catch (error) {
      if (error instanceof ApiProblem && error.status === 404) set({ state: "not_found" });
      else if (needsVerification(error)) set({ state: "needs_verification" });
      else {
        set({ error });
        throw error;
      }
    }
  }

  function adminFetch<T>(call: () => Promise<T>): Promise<T> {
    return call().catch((error: unknown) => {
      if (!needsVerification(error)) throw error;
      return new Promise<T>((resolve, reject) => {
        waiting.push({
          call,
          problem: error,
          resolve: resolve as (value: unknown) => void,
          reject,
        });
        if (snapshot.state !== "needs_verification") set({ state: "needs_verification" });
      });
    });
  }

  function retryWaiting() {
    const held = waiting;
    waiting = [];
    for (const { call, resolve, reject } of held) adminFetch(call).then(resolve, reject);
  }

  async function runVerification() {
    set({ verification: "busy" });
    try {
      const { data: options } = await client.POST("/v1/admin/verify/options");
      if (!options?.allowCredentials?.length) {
        set({ verification: "no_passkey" });
        return;
      }
      let assertion: PasskeyAssertion;
      try {
        assertion = await authenticate(options);
      } catch (error) {
        set({ verification: closedPrompt(error) ? "idle" : "failed" });
        return;
      }
      await client.POST("/v1/admin/verify", { body: assertion });
    } catch {
      // A refused assertion (400 `passkey_verification_failed`), or no answer at all: either way
      // the screen says it did not work and the button stays to try again.
      set({ verification: "failed" });
      return;
    }
    try {
      await load();
    } catch {
      // `load` kept the failure as the snapshot's error: the route's error boundary shows it.
    }
    if (snapshot.state === "ready") retryWaiting();
    // The API still asks for a verification (or the check failed): the button is usable again.
    else if (snapshot.verification === "busy") set({ verification: "idle" });
  }

  function verify(): Promise<void> {
    // Two quick taps must not open two prompts.
    verifying ??= runVerification().finally(() => {
      verifying = null;
    });
    return verifying;
  }

  function cancel() {
    const held = waiting;
    waiting = [];
    for (const { problem, reject } of held) reject(problem);
    set({ verification: "idle" });
  }

  return {
    client,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    adminFetch,
    verify,
    cancel,
  };
}

/** The live passkey prompt: SimpleWebAuthn's `startAuthentication` with the API's options. */
export async function browserAuthenticate(
  options: PasskeyRequestOptions,
): Promise<PasskeyAssertion> {
  const response: AuthenticationResponseJSON = await startAuthentication({
    optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
  });
  return response as PasskeyAssertion;
}

/** The panel's session, given by the admin layout (routes/admin.tsx). */
export const AdminSessionContext = createContext<AdminSession | null>(null);

export interface UseAdmin {
  state: AdminState;
  verifiedUntil?: Date;
  /** The signed-in admin's own account id, once the session is ready. */
  adminId?: string;
  verification: VerificationStatus;
  verify(): Promise<void>;
  cancel(): void;
  adminFetch: AdminSession["adminFetch"];
  /** The API client the admin screens call through `adminFetch`. */
  client: ApiClient;
}

/**
 * The admin panel's session, for its screens. An unexpected failure of the session check is
 * thrown here, so the route's error boundary offers a retry.
 */
export function useAdmin(): UseAdmin {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error("useAdmin needs the admin layout's AdminSessionContext");
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  if (snapshot.error) throw snapshot.error;
  return {
    state: snapshot.state,
    ...(snapshot.verifiedUntil ? { verifiedUntil: snapshot.verifiedUntil } : {}),
    ...(snapshot.adminId ? { adminId: snapshot.adminId } : {}),
    verification: snapshot.verification,
    verify: session.verify,
    cancel: session.cancel,
    adminFetch: session.adminFetch,
    client: session.client,
  };
}
