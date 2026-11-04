import { type FormEvent, useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { ApiProblem, type Translator } from "../api/errors.ts";
import { PressButton } from "../ui/PressButton.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { adminProblemMessage } from "./AdminMessages.tsx";
import { useAdmin } from "./use-admin.ts";

/** The longest reason the API takes (spec §5). */
export const REASON_MAX = 300;

/** What the admin typed in the sheet, as the action's request body wants it. */
export interface ActionFields {
  reason: string;
  /** Delete only: the account's email, or its id for a guest, as typed. */
  confirm?: string;
  /** Change email only. */
  newEmail?: string;
}

export interface ActionSheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** What the action does, in one or two sentences. */
  lead: string;
  submitLabel: string;
  /** Delete: a field that must match the account before the button turns on. */
  confirm?: { label: string; hint: string; matches(typed: string): boolean };
  /** Change email: asks for the new address too. */
  newEmail?: boolean;
  /** Sends the action (through `adminFetch`); a rejection stays in the sheet. */
  send(fields: ActionFields): Promise<unknown>;
  /** The action went through. */
  onDone(): void;
}

/**
 * One admin action's sheet (spec §5): what it does, the reason (required, 1–300, counted, with
 * the warning to leave personal data out), and for delete the confirm-by-typing field, as the
 * app's own account deletion has it. A ref guards against double submits; a failure is said
 * inside the sheet, which keeps what was typed.
 *
 * Its fields live here, not in the `Sheet`: while a stale passkey verification has the panel's
 * screen hidden, the sheet steps aside (it is a portal, outside the hidden screen) and comes back
 * with the reason still typed once the passkey is confirmed and the held request retried.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  lead,
  submitLabel,
  confirm,
  newEmail = false,
  send,
  onDone,
}: ActionSheetProps) {
  const t = useTranslations("admin.account.sheet");
  const tRoot = useTranslations() as unknown as Translator;
  const admin = useAdmin();
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: a double tap, or Enter and a tap together, must send one request.
  const inFlight = useRef(false);
  const reasonId = useId();
  const hintId = useId();
  const counterId = useId();
  const confirmId = useId();
  const confirmHintId = useId();
  const emailId = useId();
  const errorId = useId();

  const ready =
    reason.trim().length > 0 &&
    reason.length <= REASON_MAX &&
    (!confirm || confirm.matches(typed)) &&
    (!newEmail || email.trim().includes("@"));

  const close = () => {
    if (busy) return;
    setReason("");
    setTyped("");
    setEmail("");
    setError(null);
    onClose();
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await send({
        reason: reason.trim(),
        ...(confirm ? { confirm: typed } : {}),
        ...(newEmail ? { newEmail: email.trim() } : {}),
      });
    } catch (failure) {
      setError(failureText(failure));
      inFlight.current = false;
      setBusy(false);
      return;
    }
    inFlight.current = false;
    setBusy(false);
    onDone();
  }

  function failureText(failure: unknown): string {
    if (!(failure instanceof ApiProblem)) return tRoot("errors.generic");
    if (failure.code === "validation_failed") return t("reason_invalid");
    if (failure.code === "bad_request" && confirm) return t("confirm_mismatch");
    return adminProblemMessage(failure, tRoot);
  }

  const described = (...ids: string[]) => [...ids, ...(error ? [errorId] : [])].join(" ");
  const field =
    "min-h-9 min-w-0 flex-1 border-0 bg-transparent p-0 font-text text-[16px] text-ink outline-none";

  return (
    <Sheet open={open && admin.state !== "needs_verification"} onClose={close} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-(--space-4) pt-(--space-3)">
        <p className="m-0 text-[15px] text-ink">{lead}</p>
        {newEmail && (
          <div className="flex flex-col gap-(--space-1)">
            <label htmlFor={emailId} className="text-[14px] font-bold text-ink">
              {t("new_email_label")}
            </label>
            <span className="lk-input min-h-11">
              <input
                id={emailId}
                type="text"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
                className={field}
              />
            </span>
          </div>
        )}
        <div className="flex flex-col gap-(--space-1)">
          <label htmlFor={reasonId} className="text-[14px] font-bold text-ink">
            {t("reason_label")}
          </label>
          <span className="lk-input min-h-11 py-(--space-2)">
            <textarea
              id={reasonId}
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-describedby={described(hintId, counterId)}
              aria-invalid={error ? true : undefined}
              className={`${field} resize-y`}
            />
          </span>
          <span className="flex justify-between gap-(--space-2) text-[13px] text-ink-muted">
            <span id={hintId}>{t("reason_hint")}</span>
            <span id={counterId} className="shrink-0 tabular-nums">
              {t("counter", { count: reason.length })}
            </span>
          </span>
        </div>
        {confirm && (
          <div className="flex flex-col gap-(--space-1)">
            <label htmlFor={confirmId} className="text-[14px] font-bold text-ink">
              {confirm.label}
            </label>
            <span className="lk-input min-h-11">
              <input
                id={confirmId}
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-describedby={described(confirmHintId)}
                aria-invalid={error ? true : undefined}
                className={field}
              />
            </span>
            <span id={confirmHintId} className="text-[13px] break-all text-ink-muted">
              {confirm.hint}
            </span>
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="m-0 text-[15px] text-over">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-(--space-2) min-[400px]:flex-row-reverse">
          <PressButton
            type="submit"
            variant="secondary"
            className={confirm ? "flex-1 text-over" : "flex-1"}
            disabled={!ready || busy}
            aria-busy={busy || undefined}
          >
            {busy ? t("busy") : submitLabel}
          </PressButton>
          <PressButton variant="ghost" className="flex-1" disabled={busy} onClick={close}>
            {tRoot("common.cancel")}
          </PressButton>
        </div>
      </form>
    </Sheet>
  );
}
