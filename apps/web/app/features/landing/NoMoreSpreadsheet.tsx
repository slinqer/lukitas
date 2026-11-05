import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";

/** Three pains of keeping expenses in a spreadsheet, each paired with how Wambito solves it. */
const ROWS = ["open", "formula", "budget"] as const;

/**
 * Wambi's eight poses, from shredding the spreadsheet to showing Wambito on his phone:
 * `public/wambi/shredder/<n>.webp`.
 */
const POSES = Array.from({ length: 8 }, (_, index) => index + 1);

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
 * paper shredder, then three rows that set a spreadsheet's pain (✗) beside how Wambito solves it (✓). Kept light on
 * purpose: no subtitle, no column labels. On wide screens each pair sits side by side; on phones it
 * stacks. Each line carries its own hidden label, so screen readers hear which side it is.
 *
 * Wambi is a scroll film where the browser has view timelines and motion is welcome: eight poses
 * stacked over the still (`public/wambi/shredder.webp`), cross-faded by the scroll, so scrolling
 * down he shreds the sheet, takes out his phone and shows Wambito with a thumbs up, and scrolling
 * up undoes it. It plays in
 * the page's own scroll (nothing holds still) and ends while Wambi is still high on the screen.
 * Elsewhere the poses are not shown (nor downloaded) and the still stays. Nothing loops. The poses
 * are decorative: the still's text says what happens. Each pose's `--pose` is its place in the film.
 */
export function NoMoreSpreadsheet() {
  const t = useTranslations("landing.spreadsheet");
  return (
    <section id="spreadsheet" className="lk-landing-section" aria-labelledby="spreadsheet-title">
      <div className="lk-landing-card lk-landing-nosheet">
        <div className="lk-landing-nosheet-stage">
          <div className="lk-landing-nosheet-head">
            <h2 id="spreadsheet-title">{t("title")}</h2>
            <div className="lk-landing-nosheet-art">
              <img
                className="lk-landing-nosheet-still"
                src="/wambi/shredder.webp"
                alt={t("image")}
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
              />
              {POSES.map((pose) => (
                <img
                  key={pose}
                  className="lk-landing-nosheet-pose"
                  src={`/wambi/shredder/${pose}.webp`}
                  alt=""
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  style={{ "--pose": pose - 1 } as CSSProperties}
                />
              ))}
            </div>
          </div>
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
