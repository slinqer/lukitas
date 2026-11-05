import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { useApi } from "../../api/ApiProvider.tsx";
import { ApiProblem, problemMessage } from "../../api/errors.ts";
import { PressButton } from "../../ui/PressButton.tsx";
import { FieldError, ScreenTitle, SignInScreen } from "../sign-in/SignInScreen.tsx";

type Status =
  | { kind: "ready" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "expired" }
  | { kind: "taken" }
  | { kind: "failed"; message: string };

/** The page's own path; the token only leaves the address bar there (not in a story's iframe). */
const PAGE_PATH = "/confirm-email";

/**
 * `/confirm-email?token=…`: the link from the email-change message (admin panel spec §5.2). It
 * works signed in or not. Opening it spends nothing: the token is sent only when the person taps
 * the button, so a mail scanner that opens the link leaves it for its owner. Confirming signs
 * every session out, so after success the person signs in with the new email. The token leaves
 * the address bar once read, and the route sends no referrer.
 */
export function ConfirmEmail() {
  const t = useTranslations("confirm_email");
  const tRoot = useTranslations();
  const api = useApi();
  const [params] = useSearchParams();
  const [token] = useState(() => (params.get("token") ?? "").trim());
  const [status, setStatus] = useState<Status>({ kind: "ready" });

  useEffect(() => {
    if (window.location.pathname !== PAGE_PATH) return;
    window.history.replaceState(window.history.state, "", PAGE_PATH);
  }, []);

  async function confirm() {
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      await api.POST("/v1/email-change/confirm", { body: { token } });
      setStatus({ kind: "done" });
    } catch (error) {
      if (!(error instanceof ApiProblem)) throw error;
      if (error.code === "link_expired") setStatus({ kind: "expired" });
      else if (error.code === "email_taken") setStatus({ kind: "taken" });
      else setStatus({ kind: "failed", message: problemMessage(error, tRoot) });
    }
  }

  if (token === "") {
    return <Notice mood="worried" title={t("no_token_title")} lead={t("no_token_lead")} />;
  }
  switch (status.kind) {
    case "done":
      return (
        <Notice title={t("done_title")} lead={t("done_lead")}>
          <Link
            to="/sign-in"
            className="lk-btn lk-btn-primary inline-flex min-h-11 min-w-11 w-full items-center justify-center"
          >
            {t("sign_in")}
          </Link>
        </Notice>
      );
    case "expired":
      return <Notice mood="worried" title={t("expired_title")} lead={t("expired_lead")} />;
    case "taken":
      return <Notice mood="worried" title={t("taken_title")} lead={t("taken_lead")} />;
    default: {
      const sending = status.kind === "sending";
      return (
        <Notice title={t("title")} lead={t("lead")}>
          {status.kind === "failed" && (
            <div className="w-full text-center">
              <FieldError id="confirm-email-error">{status.message}</FieldError>
            </div>
          )}
          <PressButton className="w-full" disabled={sending} onClick={confirm}>
            {sending ? t("confirming") : t("confirm")}
          </PressButton>
        </Notice>
      );
    }
  }
}

function Notice({
  title,
  lead,
  mood,
  children,
}: {
  title: string;
  lead: string;
  mood?: "worried";
  children?: React.ReactNode;
}) {
  return (
    <SignInScreen {...(mood ? { mood } : {})}>
      <ScreenTitle>{title}</ScreenTitle>
      <p className="text-center text-ink-muted">{lead}</p>
      {children}
    </SignInScreen>
  );
}
