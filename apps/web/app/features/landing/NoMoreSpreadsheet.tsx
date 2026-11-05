import { useTranslations } from "use-intl";

/** Three pains of keeping expenses in a spreadsheet, each paired with how Wambito solves it. */
const ROWS = ["open", "formula", "budget"] as const;

/** A cross (the spreadsheet) or a check (Wambito), decorative: the hidden label beside it says it. */
function Mark({ kind }: { kind: "before" | "after" }) {
  return (
    <span className={`lk-landing-mark is-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {kind === "before" ? <path d="M7 7l10 10M17 7 7 17" /> : <path d="m5.5 12.5 4 4 9-9" />}
      </svg>
    </span>
  );
}

/**
 * "No more spreadsheet", right under the hero: a heading and Wambi feeding a spreadsheet into a
 * paper shredder (a still image, `public/wambi/shredder.webp`; nothing on the landing loops), then
 * three rows that set a spreadsheet's pain (✗) beside how Wambito solves it (✓). Kept light on
 * purpose: no subtitle, no column labels. On wide screens each pair sits side by side; on phones it
 * stacks. Each line carries its own hidden label, so screen readers hear which side it is.
 */
export function NoMoreSpreadsheet() {
  const t = useTranslations("landing.spreadsheet");
  return (
    <section id="spreadsheet" className="lk-landing-section" aria-labelledby="spreadsheet-title">
      <div className="lk-landing-card lk-landing-nosheet">
        <div className="lk-landing-nosheet-head">
          <h2 id="spreadsheet-title">{t("title")}</h2>
          <img
            className="lk-landing-nosheet-art"
            src="/wambi/shredder.webp"
            alt={t("image")}
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="lk-landing-compare">
          <ul>
            {ROWS.map((row) => (
              <li key={row} className="lk-landing-compare-row">
                <p className="is-before">
                  <Mark kind="before" />
                  <span>
                    <span className="sr-only">{t("before")}: </span>
                    {t(`rows.${row}.before`)}
                  </span>
                </p>
                <p className="is-after">
                  <Mark kind="after" />
                  <span>
                    <span className="sr-only">{t("after")}: </span>
                    {t(`rows.${row}.after`)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
