import { useRef } from "react";
import { useTranslations } from "use-intl";
import { useLocale } from "../../i18n/IntlProvider.tsx";
import { COMING_SOON } from "../../site/config.ts";
import { cx } from "../../ui/cx.ts";
import { PressLink } from "../../ui/PressLink.tsx";
import { LiveWambiBoundary, useLiveWambiReady } from "../../wambi/live-support.tsx";
import { TravelingWambi as TravelingWambi2D } from "../../wambi/TravelingWambi.tsx";
import { LANDING_ART, Wambi } from "../../wambi/Wambi.tsx";
import { Faq } from "./Faq.tsx";
import { Footer } from "./Footer.tsx";
import { Hero } from "./Hero.tsx";
import { HowItWorks } from "./HowItWorks.tsx";
import { appLinkProps } from "./links.ts";
import { NewTabHint } from "./NewTabHint.tsx";
import { NoMoreSpreadsheet } from "./NoMoreSpreadsheet.tsx";
import { OpenSource } from "./OpenSource.tsx";
import { useButtonGlow } from "./pointer-glow.ts";
import { SiteHeader } from "./SiteHeader.tsx";
import { UseItYourWay } from "./UseItYourWay.tsx";
import "./landing.css";

/**
 * The live, 2.5D Wambi (the founder's sprite sheets plus CSS depth), mounted once the page has
 * loaded and the browser is idle. He stands on the page's two Wambi spots, the hero and the
 * closing: he waves once there, then goes straight to the closing and celebrates once. Until then,
 * under reduced motion and without JavaScript, the prerendered 2D Wambi in both spots stays. (The 3D Wambi is an experiment in
 * `app/wambi/experimental/` and never loads here.)
 */
function TravelingWambi() {
  const ready = useLiveWambiReady();
  if (!ready) return null;
  return (
    <LiveWambiBoundary>
      <TravelingWambi2D />
    </LiveWambiBoundary>
  );
}

/** The last nudge, where Wambi lands to celebrate. */
function Closing() {
  const t = useTranslations("landing");
  const { locale } = useLocale();
  const app = appLinkProps(locale);
  // Honest about where the app is: not open yet, or open to everyone.
  const closingBody = COMING_SOON ? "closing.body_soon" : "closing.body";
  return (
    <section id="closing" className="lk-landing-section" aria-labelledby="closing-title">
      <div className="lk-landing-closing">
        <span
          className="lk-landing-spot is-closing"
          data-wambi-spot="closing"
          data-wambi-pose="celebrate"
          aria-hidden="true"
        >
          {/* He celebrates once (frame 4, fists up, at rest); nothing on the landing loops. */}
          <Wambi
            mood="celebrating"
            size="100%"
            decorative
            deferUntilNear
            art={LANDING_ART.celebrate}
            playOnce
          />
        </span>
        <h2 id="closing-title">{t("closing.title")}</h2>
        <p>{t(closingBody)}</p>
        <PressLink {...app} className={cx(COMING_SOON && "is-soon")}>
          {t(COMING_SOON ? "hero.cta_soon" : "hero.cta")}
          <NewTabHint target={app.target} />
        </PressLink>
      </div>
    </section>
  );
}

/**
 * The landing page (`/` in Spanish, `/en` in English), prerendered to static HTML: everything here
 * renders without JavaScript and in the URL's language.
 */
export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useButtonGlow(root);
  return (
    <div ref={root} className="lk-screen lk-landing">
      <SiteHeader page="landing" />
      <main className="lk-landing-wrap">
        <Hero />
        <NoMoreSpreadsheet />
        <HowItWorks />
        <UseItYourWay />
        <OpenSource />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <TravelingWambi />
    </div>
  );
}
