import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { formatMoney } from "../../i18n/format.ts";
import { useLocale } from "../../i18n/IntlProvider.tsx";

/** Sample figures for the illustrations (cents, euros). */
const DEMO = {
  expense: -300,
  groceries: { remaining: 4633, filled: "62%" },
  goingOut: { remaining: 800, filled: "91%" },
  importedRows: 1248,
} as const;

/** How long the imported count takes to run from 0 to its total, in ms. */
const COUNT_MS = 1600;

/**
 * "1248 transactions ready", counting up from 0 when the pointer comes onto its card (on phones,
 * when the card is tapped), then a check pops to confirm. Before that, and without JavaScript or
 * under reduced motion, it shows the final count, confirmed. No motion library: this is the landing.
 */
function ImportedCount({ total }: { total: number }) {
  const t = useTranslations("landing.how");
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(total);
  const [runs, setRuns] = useState(0);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    const card = ref.current?.closest("li");
    if (!card) return;
    let frame = 0;
    let running = false;
    const run = (event: PointerEvent) => {
      if (event.type === "pointerenter" && event.pointerType === "touch") return;
      if (running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      running = true;
      setCounting(true);
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / COUNT_MS);
        // Ease out: fast at first, settling on the total.
        setShown(Math.round(total * (1 - (1 - progress) ** 3)));
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
          return;
        }
        running = false;
        setCounting(false);
        setRuns((n) => n + 1);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    };
    card.addEventListener("pointerenter", run);
    card.addEventListener("pointerdown", run);
    return () => {
      card.removeEventListener("pointerenter", run);
      card.removeEventListener("pointerdown", run);
      cancelAnimationFrame(frame);
    };
  }, [total]);

  return (
    <span
      ref={ref}
      className="lk-landing-imported"
      data-state={counting ? "counting" : "done"}
      data-runs={runs}
    >
      {t("import.demo_rows", { count: shown })}
      <span key={runs} className="lk-landing-imported-check">
        <svg viewBox="0 0 24 24">
          <path d="m5.5 12.5 4 4 9-9" />
        </svg>
      </span>
    </span>
  );
}

function Step({ demo, title, body }: { demo: ReactNode; title: string; body: string }) {
  return (
    <li className="lk-landing-card">
      {/* The illustration repeats what the text says, so it is hidden from assistive technology. */}
      <div className="lk-landing-demo" aria-hidden="true">
        {demo}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </li>
  );
}

/**
 * How Wambito, the app, works, in four steps, each with a small illustration built from the
 * app's own pieces: logging an expense by voice (the Android widget), where the money goes, budgets
 * that warn you, importing your history from other apps (Budge today).
 */
export function HowItWorks() {
  const t = useTranslations("landing.how");
  const { locale } = useLocale();
  const money = (cents: number) => formatMoney(cents, "EUR", locale);
  const dot = (color: string) => ({ "--dot": color }) as CSSProperties;

  return (
    <section id="how" className="lk-landing-section" aria-labelledby="how-title">
      <div className="lk-landing-section-head">
        <h2 id="how-title">{t("title")}</h2>
      </div>
      <ul className="lk-landing-cards is-how">
        <Step
          title={t("voice.title")}
          body={t("voice.body")}
          demo={
            <>
              <div className="lk-landing-voice">
                <span className="lk-landing-mic">
                  <svg viewBox="0 0 24 24">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
                  </svg>
                </span>
                <span className="lk-landing-said">{t("voice.demo_said")}</span>
              </div>
              <div className="lk-landing-demo-row">
                <span className="lk-tile">☕</span>
                <span className="lk-landing-demo-name">{t("voice.demo_name")}</span>
                <span className="lk-amount lk-landing-demo-expense">{money(DEMO.expense)}</span>
              </div>
              <span className="lk-landing-saved">{t("voice.demo_saved")}</span>
            </>
          }
        />
        <Step
          title={t("spend.title")}
          body={t("spend.body")}
          demo={
            <div className="lk-landing-demo-row">
              <span className="lk-landing-donut" />
              <div className="grid gap-(--space-2)">
                <span className="lk-overline">{t("spend.demo_label")}</span>
                <ul className="lk-landing-legend">
                  <li style={dot("var(--candy)")}>{t("demo_categories.groceries")}</li>
                  <li style={dot("var(--brand-glow)")}>{t("demo_categories.home")}</li>
                  <li style={dot("var(--near)")}>{t("demo_categories.going_out")}</li>
                  <li style={dot("var(--good)")}>{t("demo_categories.transport")}</li>
                </ul>
              </div>
            </div>
          }
        />
        <Step
          title={t("budgets.title")}
          body={t("budgets.body")}
          demo={
            <>
              <div className="lk-landing-budget">
                <div className="lk-rowtop">
                  <span>{t("demo_categories.groceries")}</span>
                  <span className="lk-status">
                    {t("budgets.demo_remaining", { amount: money(DEMO.groceries.remaining) })}
                  </span>
                </div>
                <div className="lk-bar">
                  <span style={{ width: DEMO.groceries.filled }} />
                </div>
              </div>
              <div className="lk-landing-budget">
                <div className="lk-rowtop">
                  <span>{t("demo_categories.going_out")}</span>
                  <span className="lk-status is-near">
                    {t("budgets.demo_remaining", { amount: money(DEMO.goingOut.remaining) })}
                  </span>
                </div>
                <div className="lk-bar is-near">
                  <span style={{ width: DEMO.goingOut.filled }} />
                </div>
              </div>
            </>
          }
        />
        <Step
          title={t("import.title")}
          body={t("import.body")}
          demo={
            <div className="lk-landing-demo-row flex-wrap">
              <span className="lk-landing-file">{t("import.demo_file")}</span>
              <svg className="lk-landing-arrow" viewBox="0 0 24 24">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
              <ImportedCount total={DEMO.importedRows} />
            </div>
          }
        />
      </ul>
    </section>
  );
}
