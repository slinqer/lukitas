import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { useLocale } from "../../i18n/IntlProvider.tsx";
import { LANDING_PATH } from "../../site/paths.ts";
import { Footer } from "../landing/Footer.tsx";
import { SiteHeader } from "../landing/SiteHeader.tsx";
import { CaptureSteps } from "./CaptureSteps.tsx";
import "../landing/landing.css";
import "./capture.css";

/**
 * `/automatic-capture` (and its languages), prerendered on the landing's look: the title, the
 * lead, the five steps, the "soon" line and the way back to the landing.
 */
export function CapturePage() {
  const t = useTranslations("landing.capture.page");
  const { locale } = useLocale();
  return (
    <div className="lk-screen lk-landing">
      <SiteHeader page="automaticCapture" />
      <main className="lk-landing-wrap lk-capture-page">
        <header className="lk-capture-intro">
          <h1>{t("title")}</h1>
          <p>{t("lead")}</p>
        </header>
        <CaptureSteps />
        <p className="lk-capture-soon">{t("soon")}</p>
        <Link to={LANDING_PATH[locale]} className="lk-capture-back">
          {t("back")}
        </Link>
      </main>
      <Footer page="automaticCapture" />
    </div>
  );
}
