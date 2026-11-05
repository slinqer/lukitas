import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "use-intl";
import { SrTable } from "../features/insights/parts.tsx";
import type { AdminMetrics } from "./MetricCards.tsx";

const HEIGHT = 200;

/**
 * Sign-ups per ISO week (UTC), the last 12, stacked: accounts with email under guests. The
 * drawing is decorative (`aria-hidden`); screen readers get the same figures as a table. Colors
 * are tokens, set by class in app.css (`.lk-admin-bars`).
 */
export function SignupsChart({ weekly }: { weekly: AdminMetrics["weekly"] }) {
  const t = useTranslations("admin.home.chart");
  const locale = useLocale();
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const points = weekly.map((w) => ({
    ...w,
    label: day.format(new Date(`${w.weekStart}T00:00:00Z`)),
  }));
  return (
    <section
      aria-labelledby="admin-signups-title"
      className="lk-hero flex min-w-0 flex-col gap-(--space-3)"
    >
      <div className="flex flex-col gap-(--space-1)">
        <h2
          id="admin-signups-title"
          className="m-0 font-display text-[20px] leading-tight font-bold text-ink"
        >
          {t("title")}
        </h2>
        <p className="m-0 text-[13px] font-bold text-ink-muted">{t("subtitle")}</p>
      </div>
      <div aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height={HEIGHT}
          initialDimension={{ width: 320, height: HEIGHT }}
        >
          <BarChart
            data={points}
            accessibilityLayer={false}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            barCategoryGap="22%"
            className="lk-admin-bars"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
              height={24}
            />
            <YAxis
              width={32}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              allowDecimals={false}
              domain={[0, "auto"]}
              tick={{ className: "lk-admin-bars-tick" }}
            />
            <Bar
              dataKey="withEmail"
              stackId="signups"
              className="lk-admin-bars-email"
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Bar
              dataKey="guests"
              stackId="signups"
              className="lk-admin-bars-guests"
              radius={[6, 6, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul
        aria-hidden="true"
        className="m-0 flex list-none flex-wrap gap-x-(--space-4) gap-y-(--space-1) p-0 text-[13px] font-bold text-ink-muted"
      >
        <li className="flex items-center gap-(--space-2)">
          <span className="lk-swatch lk-admin-swatch-email" />
          {t("with_email")}
        </li>
        <li className="flex items-center gap-(--space-2)">
          <span className="lk-swatch lk-admin-swatch-guests" />
          {t("guests")}
        </li>
      </ul>
      <SrTable
        caption={t("title")}
        head={[t("week"), t("with_email"), t("guests")]}
        rows={points.map((p) => ({
          key: p.weekStart,
          cells: [t("week_of", { date: p.label }), String(p.withEmail), String(p.guests)],
        }))}
      />
    </section>
  );
}
