import { useLocale, useTranslations } from "use-intl";
import type { components } from "../api/schema";
import { PressButton } from "../ui/PressButton.tsx";

export type AuditEntry = components["schemas"]["AdminAuditEntry"];

export interface AuditListProps {
  entries: AuditEntry[];
  /** There is another page after these. */
  hasMore: boolean;
  loadingMore: boolean;
  /** The last "Load more" failed. */
  moreFailed: boolean;
  onMore(): void;
  /** The heading (and the list's name); the panel-wide log's by default. */
  title?: string;
}

/**
 * The audit log, newest first, 50 a page (spec §6): what was done in words (never the raw action
 * code), when, to which account and why. "Load more" follows the API's cursor.
 */
export function AuditList({
  entries,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
  title,
}: AuditListProps) {
  const t = useTranslations("admin.home.audit");
  const when = new Intl.DateTimeFormat(useLocale(), { dateStyle: "medium", timeStyle: "short" });
  const action = (code: string) => (t.has(`actions.${code}`) ? t(`actions.${code}`) : code);
  return (
    <section
      aria-labelledby="admin-audit-title"
      className="lk-hero flex min-w-0 flex-col gap-(--space-3)"
    >
      <h2
        id="admin-audit-title"
        className="m-0 font-display text-[20px] leading-tight font-bold text-ink"
      >
        {title ?? t("title")}
      </h2>
      {entries.length === 0 ? (
        <p className="m-0 text-ink-muted">{t("empty")}</p>
      ) : (
        <ul
          aria-labelledby="admin-audit-title"
          className="m-0 flex list-none flex-col gap-(--space-2) p-0"
        >
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-sunken px-(--space-3) py-(--space-2)"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-(--space-3)">
                <span className="font-bold text-ink">{action(e.action)}</span>
                <time dateTime={e.at} className="text-[13px] font-bold text-ink-muted">
                  {when.format(new Date(e.at))}
                </time>
              </div>
              {e.targetUserId && (
                <span className="text-[13px] break-all text-ink-muted">
                  {t("target", { id: e.targetUserId })}
                </span>
              )}
              <span className="text-[14px] break-words text-ink">{e.reason ?? t("no_reason")}</span>
            </li>
          ))}
        </ul>
      )}
      {moreFailed && (
        <p role="alert" className="m-0 text-[15px] text-over">
          {t("more_failed")}
        </p>
      )}
      {hasMore && (
        <PressButton variant="secondary" disabled={loadingMore} onClick={onMore}>
          {loadingMore ? t("loading_more") : t("more")}
        </PressButton>
      )}
    </section>
  );
}
