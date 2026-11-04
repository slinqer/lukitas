import { Outlet } from "react-router";
import NotFoundRoute from "../routes/not-found.tsx";
import { useAdmin } from "./use-admin.ts";
import { VerifyScreen } from "./VerifyScreen.tsx";

/**
 * What the admin layout shows for the session's state: nothing while it loads, the ordinary
 * not-found page for a non-admin, and the panel's screen otherwise. A missing or stale passkey
 * verification puts `VerifyScreen` over the screen, which stays mounted (hidden) so a call that
 * met the 401, and whatever was typed for it, goes on once the passkey is confirmed.
 */
export function AdminGate() {
  const admin = useAdmin();
  if (admin.state === "loading") return <div className="lk-screen min-h-dvh" />;
  if (admin.state === "not_found") return <NotFoundRoute />;
  const verifying = admin.state === "needs_verification";
  return (
    <>
      {verifying && (
        <VerifyScreen
          verification={admin.verification}
          onVerify={() => {
            // A failure already shows (the screen's state, or the error boundary): never unhandled.
            admin.verify().catch(() => {});
          }}
        />
      )}
      <div hidden={verifying}>
        <Outlet />
      </div>
    </>
  );
}
