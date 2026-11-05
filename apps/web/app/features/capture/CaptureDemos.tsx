import { useTranslations } from "use-intl";
import { formatMoney } from "../../i18n/format.ts";
import { useLocale } from "../../i18n/IntlProvider.tsx";
import "./capture.css";

/** Invented sample figures for the illustrations (cents, euros). */
const DEMO = {
  expense: -1250,
  income: 120000,
  merchant: "Pastelaria Aurora",
  payroll: "Nómina",
  bank: "Revolut",
  time: "17:06",
} as const;

function useMoney() {
  const { locale } = useLocale();
  // Negative amounts carry their minus; only the income amount gets a plus.
  return (cents: number, opts?: { sign?: "always" }) => formatMoney(cents, "EUR", locale, opts);
}

const plus = (cents: number) => (cents > 0 ? ({ sign: "always" } as const) : undefined);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5.5 12.5 4 4 9-9" />
  </svg>
);

const ArrowDown = () => (
  <span className="lk-capture-arrow">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  </span>
);

function Notification({ title, cents }: { title: string; cents: number }) {
  const money = useMoney();
  return (
    <div className="lk-capture-notif">
      <span className="lk-capture-notif-icon">R</span>
      <span className="lk-capture-notif-app">{DEMO.bank}</span>
      <span className="lk-capture-notif-time">{DEMO.time}</span>
      <span className="lk-capture-notif-title">{title}</span>
      <span className="lk-capture-notif-line">💳 {money(cents, plus(cents))}</span>
    </div>
  );
}

function RegisteredRow({
  name,
  cents,
  category,
}: {
  name: string;
  cents: number;
  category?: string;
}) {
  const t = useTranslations("landing.capture.demo");
  const money = useMoney();
  return (
    <div className="lk-capture-row">
      <span className="lk-tile">{cents < 0 ? "🛍️" : "💼"}</span>
      <span className="lk-capture-row-main">
        <span className="lk-capture-row-name">{name}</span>
        <span className="lk-capture-row-sub">
          {category ? `${category} · ` : ""}
          <span className="lk-capture-review">{t("review")}</span>
        </span>
      </span>
      <span className={`lk-amount ${cents < 0 ? "lk-capture-expense" : "lk-capture-income"}`}>
        {money(cents, plus(cents))}
      </span>
    </div>
  );
}

function Pair({ title, cents, category }: { title: string; cents: number; category?: string }) {
  const t = useTranslations("landing.capture.demo");
  return (
    <>
      <Notification title={title} cents={cents} />
      <ArrowDown />
      <div className="lk-capture-registered">
        <span className="lk-capture-registered-head">
          <Check />
          {t("registered")}
        </span>
        <RegisteredRow name={title} cents={cents} category={category} />
      </div>
    </>
  );
}

/** Step 1: the bank's notification becomes a movement marked "to review". */
export function MainPicture({ income = false }: { income?: boolean }) {
  const t = useTranslations("landing.capture.demo");
  return (
    <div className="lk-capture-demo" aria-hidden="true">
      <Pair title={DEMO.merchant} cents={DEMO.expense} category={t("other_expenses")} />
      {income ? (
        <Pair title={DEMO.payroll} cents={DEMO.income} category={t("other_income")} />
      ) : null}
    </div>
  );
}

/** Step 2: only these four things leave the phone. */
export function ChipsDemo() {
  const t = useTranslations("landing.capture.demo");
  const money = useMoney();
  return (
    <div className="lk-capture-demo lk-capture-chips" aria-hidden="true">
      <span className="lk-capture-chip">{money(-DEMO.expense)}</span>
      <span className="lk-capture-chip">{DEMO.merchant}</span>
      <span className="lk-capture-chip">{t("today")}</span>
      <span className="lk-capture-chip">{DEMO.bank}</span>
    </div>
  );
}

/** Step 3: Wambito's own notification, with its two buttons. */
export function NoticeDemo() {
  const t = useTranslations("landing.capture.demo");
  const money = useMoney();
  return (
    <div className="lk-capture-demo" aria-hidden="true">
      <div className="lk-capture-notif">
        <span className="lk-capture-notif-icon">W</span>
        <span className="lk-capture-notif-app">Wambito</span>
        <span className="lk-capture-notif-time">{DEMO.time}</span>
        <span className="lk-capture-notif-line">
          {t("notice", {
            amount: money(DEMO.expense),
            merchant: DEMO.merchant,
            category: t("other_expenses"),
          })}
        </span>
        <span className="lk-capture-notif-actions">
          <span className="lk-capture-notif-action">{t("ok")}</span>
          <span className="lk-capture-notif-action">{t("change")}</span>
        </span>
      </div>
    </div>
  );
}

/** Step 4: the second time at the same merchant, the category is already there. */
export function LearnDemo() {
  const t = useTranslations("landing.capture.demo");
  const money = useMoney();
  return (
    <div className="lk-capture-demo" aria-hidden="true">
      {[0, 1].map((n) => (
        <div className="lk-capture-row" key={n}>
          <span className="lk-tile">{n === 0 ? "🛍️" : "🍽️"}</span>
          <span className="lk-capture-row-main">
            <span className="lk-capture-row-name">{DEMO.merchant}</span>
            <span className="lk-capture-row-sub">
              {n === 0 ? (
                <>
                  {`${t("other_expenses")} · `}
                  <span className="lk-capture-review">{t("review")}</span>
                </>
              ) : (
                t("eating_out")
              )}
            </span>
          </span>
          {n === 1 ? (
            <span className="lk-capture-check">
              <Check />
            </span>
          ) : null}
          <span className="lk-amount lk-capture-expense">{money(DEMO.expense)}</span>
        </div>
      ))}
    </div>
  );
}
