import { useEffect, useState } from "react";
import { createTranslator } from "use-intl/core";
import { AdminGate } from "../admin/AdminGate.tsx";
import { AdminMessages } from "../admin/AdminMessages.tsx";
import {
  AdminSessionContext,
  browserAuthenticate,
  createAdminSession,
} from "../admin/use-admin.ts";
import { ApiProvider, useApi } from "../api/ApiProvider.tsx";
import { requireSession } from "../auth/session.ts";
import { ScreenError } from "../features/home/ScreenError.tsx";
import adminEs from "../i18n/messages/admin.es.json" with { type: "json" };
import { ToastProvider } from "../ui/Toast.tsx";
import type { Route } from "./+types/admin";

export const meta = () => {
  const t = createTranslator({ locale: "es", messages: adminEs, namespace: "admin" });
  return [{ title: t("meta_title") }, { name: "robots", content: "noindex" }];
};

/**
 * Signed in only: a signed-out visitor goes to sign-in and comes back here. (The admin API answers
 * a signed-out request with the same 404 as anyone else's, so this is the app's own session
 * check.) Whether the person is an admin is the API's call, asked by `useAdmin`.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  await requireSession(`${url.pathname}${url.search}`);
  return null;
}

/** While the session is checked: the screen's background, nothing to read yet. */
export function HydrateFallback() {
  return <div className="lk-screen min-h-dvh" />;
}

/**
 * `/admin/*`: the admin panel (spec §3, §4), beside the app's layout and the demo and, like them,
 * not in the landing-only build. It has the app's API client (cookies only) and toasts, and its
 * own messages (`AdminMessages`, Spanish or English). Not an admin: the ordinary not-found page.
 * A missing or stale passkey verification: `VerifyScreen`, over the panel's screens, which stay
 * mounted so a call that met the 401 goes on once the passkey is confirmed.
 */
export default function AdminLayout() {
  return (
    <AdminMessages>
      <ApiProvider>
        <ToastProvider>
          <AdminSessionProvider>
            <AdminGate />
          </AdminSessionProvider>
        </ToastProvider>
      </ApiProvider>
    </AdminMessages>
  );
}

function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const client = useApi();
  const [session] = useState(() =>
    createAdminSession({ client, authenticate: browserAuthenticate }),
  );
  useEffect(() => {
    // A failure other than 404/401 is kept in the session and thrown by `useAdmin`.
    session.load().catch(() => {});
    // Leaving the panel gives up on a verification that was asked for.
    return () => session.cancel();
  }, [session]);
  return <AdminSessionContext value={session}>{children}</AdminSessionContext>;
}

/** A failed session check (no connection, a server error): what went wrong and a retry. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <AdminMessages>
      <ScreenError error={error} />
    </AdminMessages>
  );
}
