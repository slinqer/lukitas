import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { ApiProblem } from "../api/errors.ts";
import type { components } from "../api/schema";
import { emailMatches } from "../features/settings/settings-model.ts";
import { PressButton } from "../ui/PressButton.tsx";
import { useToast } from "../ui/Toast.tsx";
import { type ActionFields, ActionSheet, type ActionSheetProps } from "./ActionSheet.tsx";
import { type AuditEntry, AuditList } from "./AuditList.tsx";
import { useAdmin } from "./use-admin.ts";

export type AdminUserView = components["schemas"]["AdminUser"];

type View =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ready"; user: AdminUserView };

interface Audit {
  entries: AuditEntry[];
  next: string | null;
  loadingMore: boolean;
  moreFailed: boolean;
}

/** An open (or closing) sheet: which action, and the sheet's words and request. */
interface OpenSheet {
  key: string;
  open: boolean;
  props: Omit<ActionSheetProps, "open" | "onClose" | "onDone">;
  done: string;
  /** Delete: the account is gone, so back to the home instead of reloading it. */
  leaves?: boolean;
}

/**
 * `/admin/users/:id` (spec §5): what the panel knows about one account (never finance data), a
 * guest shown as "Guest" rather than its placeholder address, the account's own audit entries,
 * and a button per action, each opening an `ActionSheet` that asks for a reason. The admin's own
 * account cannot be deleted or suspended here (a note says why). After an action the view is
 * asked for again; after a delete the panel goes home and says so.
 */
export function AccountScreen({ userId }: { userId: string }) {
  const t = useTranslations("admin.account");
  const tErrors = useTranslations("admin.errors");
  const admin = useAdmin();
  const { adminFetch, client } = admin;
  const toast = useToast();
  const navigate = useNavigate();
  const locale = useLocale();
  const ownNoteId = useId();
  const [view, setView] = useState<View>({ status: "loading" });
  const [audit, setAudit] = useState<Audit | null>(null);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);

  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const moment = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const load = useCallback(() => {
    adminFetch(() => client.GET("/v1/admin/users", { params: { query: { id: userId } } })).then(
      ({ data }) => setView(data ? { status: "ready", user: data } : { status: "error" }),
      (failure: unknown) =>
        setView({
          status:
            failure instanceof ApiProblem && failure.code === "user_not_found"
              ? "not_found"
              : "error",
        }),
    );
    adminFetch(() =>
      client.GET("/v1/admin/audit", { params: { query: { targetUserId: userId } } }),
    ).then(
      ({ data }) => {
        if (data) setAudit({ ...data, loadingMore: false, moreFailed: false });
      },
      () => {},
    );
  }, [adminFetch, client, userId]);

  useEffect(load, [load]);

  function loadMore() {
    if (!audit?.next) return;
    const before = audit.next;
    setAudit({ ...audit, loadingMore: true, moreFailed: false });
    adminFetch(() =>
      client.GET("/v1/admin/audit", { params: { query: { targetUserId: userId, before } } }),
    ).then(
      ({ data }) =>
        setAudit((now) =>
          now && data
            ? {
                entries: [...now.entries, ...data.entries],
                next: data.next,
                loadingMore: false,
                moreFailed: false,
              }
            : now,
        ),
      () => setAudit((now) => (now ? { ...now, loadingMore: false, moreFailed: true } : now)),
    );
  }

  const retry = () => {
    setView({ status: "loading" });
    load();
  };

  const closeSheet = () => setSheet((now) => (now ? { ...now, open: false } : now));

  function finished() {
    if (!sheet) return;
    toast.show({ message: sheet.done });
    closeSheet();
    if (sheet.leaves) void navigate("/admin", { replace: true });
    else load();
  }

  const path = { params: { path: { id: userId } } };
  const reasonOnly = (fields: ActionFields) => ({ reason: fields.reason });

  function openAction(user: AdminUserView, action: string, extra?: { name: string; id: string }) {
    const s = (key: string, values?: Record<string, string>) => t(`sheet.${key}`, values);
    const base = (name: string, send: OpenSheet["props"]["send"], leaves = false): OpenSheet => ({
      key: `${action}:${extra?.id ?? ""}`,
      open: true,
      props: {
        title: s(`${name}.title`, extra ? { name: extra.name } : undefined),
        lead: s(`${name}.lead`),
        submitLabel: s(`${name}.submit`),
        send,
      },
      done: s(`${name}.done`),
      leaves,
    });
    const call = (request: () => Promise<unknown>) => adminFetch(request);
    switch (action) {
      case "change_email": {
        const next = base("change_email", (f) =>
          call(() =>
            client.POST("/v1/admin/users/{id}/email-change", {
              ...path,
              body: { reason: f.reason, newEmail: f.newEmail ?? "" },
            }),
          ),
        );
        next.props.newEmail = true;
        return setSheet(next);
      }
      case "sign_out":
        return setSheet(
          base("sign_out", (f) =>
            call(() =>
              client.POST("/v1/admin/users/{id}/sessions/revoke", { ...path, body: reasonOnly(f) }),
            ),
          ),
        );
      case "suspend":
        return setSheet(
          base("suspend", (f) =>
            call(() =>
              client.POST("/v1/admin/users/{id}/suspend", { ...path, body: reasonOnly(f) }),
            ),
          ),
        );
      case "reactivate":
        return setSheet(
          base("reactivate", (f) =>
            call(() =>
              client.POST("/v1/admin/users/{id}/reactivate", { ...path, body: reasonOnly(f) }),
            ),
          ),
        );
      case "delete": {
        const next = base(
          "delete",
          (f) =>
            call(() =>
              client.DELETE("/v1/admin/users/{id}", {
                ...path,
                body: { reason: f.reason, confirm: f.confirm ?? "" },
              }),
            ),
          true,
        );
        next.props.confirm = user.email
          ? {
              label: s("confirm_label"),
              hint: s("confirm_hint", { value: user.email }),
              matches: (typed) => emailMatches(typed, user.email ?? ""),
            }
          : {
              label: s("confirm_label_guest"),
              hint: s("confirm_hint", { value: user.id }),
              matches: (typed) => typed.trim() === user.id,
            };
        return setSheet(next);
      }
      case "assistant":
        return setSheet(
          base("assistant", (f) =>
            call(() =>
              client.DELETE("/v1/admin/users/{id}/assistants/{clientId}", {
                params: { path: { id: userId, clientId: extra?.id ?? "" } },
                body: reasonOnly(f),
              }),
            ),
          ),
        );
      case "passkey":
        return setSheet(
          base("passkey", (f) =>
            call(() =>
              client.DELETE("/v1/admin/users/{id}/passkeys/{passkeyId}", {
                params: { path: { id: userId, passkeyId: extra?.id ?? "" } },
                body: reasonOnly(f),
              }),
            ),
          ),
        );
    }
  }

  const user = view.status === "ready" ? view.user : null;
  const own = user !== null && user.id === admin.adminId;
  const guest = user !== null && (user.isAnonymous || user.email === null);

  return (
    <main className="lk-screen min-h-dvh">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-(--space-4) px-(--space-4) py-(--space-5)">
        <Link
          to="/admin"
          className="self-start text-[15px] font-bold text-ink underline focus-visible:outline-3 focus-visible:outline-focus focus-visible:outline-offset-2"
        >
          {t("back")}
        </Link>
        {view.status === "loading" && (
          <p role="status" className="m-0 text-ink-muted">
            {t("loading")}
          </p>
        )}
        {view.status === "not_found" && (
          <p role="alert" className="m-0 text-over">
            {tErrors("user_not_found")}
          </p>
        )}
        {view.status === "error" && (
          <div className="flex flex-col items-start gap-(--space-3)">
            <p role="alert" className="m-0 text-over">
              {t("error")}
            </p>
            <PressButton variant="secondary" onClick={retry}>
              {t("retry")}
            </PressButton>
          </div>
        )}
        {user && (
          <>
            <h1 className="m-0 font-display text-[28px] leading-tight font-bold break-all text-ink">
              {guest ? t("guest") : user.email}
            </h1>
            <dl className="lk-hero m-0 grid grid-cols-1 gap-(--space-3) min-[480px]:grid-cols-2">
              <Field label={t("fields.id")}>
                <span className="break-all">{user.id}</span>
              </Field>
              <Field label={t("fields.status")}>
                {user.suspendedAt ? (
                  <span className="font-bold text-over">
                    {t("fields.suspended_since", {
                      date: moment.format(new Date(user.suspendedAt)),
                    })}
                  </span>
                ) : (
                  t("fields.active")
                )}
              </Field>
              <Field label={t("fields.created")}>{day.format(new Date(user.createdAt))}</Field>
              <Field label={t("fields.last_active")}>
                {user.lastActiveAt ? moment.format(new Date(user.lastActiveAt)) : t("fields.never")}
              </Field>
              <Field label={t("fields.locale")}>{user.locale}</Field>
              <Field label={t("fields.sessions")}>{user.sessionCount}</Field>
            </dl>

            <Listing
              title={t("passkeys.title")}
              empty={t("passkeys.empty")}
              items={user.passkeys.map((p) => {
                const name = p.name ?? t("passkeys.unnamed");
                const device = t.has(`passkeys.device.${p.deviceType}`)
                  ? t(`passkeys.device.${p.deviceType}`)
                  : p.deviceType;
                const added = p.createdAt
                  ? ` · ${t("passkeys.created", { date: day.format(new Date(p.createdAt)) })}`
                  : "";
                return {
                  key: p.id,
                  name,
                  detail: `${device}${added}`,
                  verb: t("passkeys.remove_verb"),
                  action: t("passkeys.remove", { name }),
                  onAction: () => openAction(user, "passkey", { name, id: p.id }),
                };
              })}
            />
            <Listing
              title={t("assistants.title")}
              empty={t("assistants.empty")}
              items={user.assistants.map((a) => ({
                key: a.clientId,
                name: a.name,
                detail: t("assistants.consented", {
                  date: day.format(new Date(a.consentedAt)),
                }),
                verb: t("assistants.revoke_verb"),
                action: t("assistants.revoke", { name: a.name }),
                onAction: () => openAction(user, "assistant", { name: a.name, id: a.clientId }),
              }))}
            />

            <section
              aria-labelledby={`${ownNoteId}-actions`}
              className="lk-hero flex flex-col gap-(--space-3)"
            >
              <h2
                id={`${ownNoteId}-actions`}
                className="m-0 font-display text-[20px] leading-tight font-bold text-ink"
              >
                {t("actions.title")}
              </h2>
              <div className="flex flex-col gap-(--space-2) min-[480px]:flex-row min-[480px]:flex-wrap">
                {!guest && (
                  <PressButton variant="secondary" onClick={() => openAction(user, "change_email")}>
                    {t("actions.change_email")}
                  </PressButton>
                )}
                <PressButton variant="secondary" onClick={() => openAction(user, "sign_out")}>
                  {t("actions.sign_out")}
                </PressButton>
                {user.suspendedAt ? (
                  <PressButton variant="secondary" onClick={() => openAction(user, "reactivate")}>
                    {t("actions.reactivate")}
                  </PressButton>
                ) : (
                  <PressButton
                    variant="secondary"
                    disabled={own}
                    aria-describedby={own ? ownNoteId : undefined}
                    onClick={() => openAction(user, "suspend")}
                  >
                    {t("actions.suspend")}
                  </PressButton>
                )}
                <PressButton
                  variant="secondary"
                  className="text-over"
                  disabled={own}
                  aria-describedby={own ? ownNoteId : undefined}
                  onClick={() => openAction(user, "delete")}
                >
                  {t("actions.delete")}
                </PressButton>
              </div>
              {own && (
                <p id={ownNoteId} className="m-0 text-[14px] text-ink-muted">
                  {t("own")}
                </p>
              )}
            </section>
          </>
        )}
        {audit && (
          <AuditList
            title={t("audit_title")}
            entries={audit.entries}
            hasMore={audit.next !== null}
            loadingMore={audit.loadingMore}
            moreFailed={audit.moreFailed}
            onMore={loadMore}
          />
        )}
      </div>
      {sheet && (
        <ActionSheet
          key={sheet.key}
          {...sheet.props}
          open={sheet.open}
          onClose={closeSheet}
          onDone={finished}
        />
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[13px] font-bold text-ink-muted">{label}</dt>
      <dd className="m-0 text-ink">{children}</dd>
    </div>
  );
}

interface ListingItem {
  key: string;
  name: string;
  detail: string;
  /** The button's visible word; `action` names it in full (with the item) for assistive tech. */
  verb: string;
  action: string;
  onAction(): void;
}

/** The passkeys, or the assistants: one row each with its remove button, or a line saying none. */
function Listing({ title, empty, items }: { title: string; empty: string; items: ListingItem[] }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="lk-hero flex flex-col gap-(--space-3)">
      <h2 id={id} className="m-0 font-display text-[20px] leading-tight font-bold text-ink">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="m-0 text-ink-muted">{empty}</p>
      ) : (
        <ul aria-labelledby={id} className="m-0 flex list-none flex-col gap-(--space-2) p-0">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-(--space-2) rounded-lg bg-surface-sunken px-(--space-3) py-(--space-2)"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-bold break-words text-ink">{item.name}</span>
                <span className="text-[13px] text-ink-muted">{item.detail}</span>
              </span>
              <PressButton
                variant="ghost"
                size="sm"
                aria-label={item.action}
                onClick={item.onAction}
              >
                {item.verb}
              </PressButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
