import { useTranslations } from "use-intl";
import { ApiProblem, problemMessage, type Translator } from "../../api/errors.ts";
import { PressButton } from "../../ui/PressButton.tsx";
import { Wambi } from "../../wambi/Wambi.tsx";

/**
 * What a screen of the app (or of the demo) shows when its loader or render fails, e.g. a session
 * check with no connection or a server error (the guards throw those rather than sending anyone to
 * sign-in): what went wrong, in the catalog's words, and a retry that loads the page again.
 */
export function ScreenError({ error }: { error: unknown }) {
  const t = useTranslations() as unknown as Translator;
  const message = error instanceof ApiProblem ? problemMessage(error, t) : t("errors.generic");
  return (
    <main className="lk-screen flex min-h-dvh flex-col items-center justify-center gap-(--space-4) p-(--space-4) text-center">
      <Wambi mood="worried" size={96} />
      <p role="alert" className="max-w-[360px] text-ink">
        {message}
      </p>
      <PressButton onClick={() => window.location.reload()}>{t("common.retry")}</PressButton>
    </main>
  );
}
