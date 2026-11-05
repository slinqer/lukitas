import { type FormEvent, useId, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ApiProblem } from "../api/errors.ts";
import { PressButton } from "../ui/PressButton.tsx";
import { adminProblemMessage } from "./AdminMessages.tsx";
import { lookupQuery } from "./lookup.ts";
import { useAdmin } from "./use-admin.ts";

/**
 * Find an account by email or id (spec §6). A hit opens its page (`/admin/users/:id`); a miss is
 * said beside the box, which keeps what was typed.
 */
export function LookupBox() {
  const t = useTranslations("admin.home.lookup");
  const tAll = useTranslations();
  const admin = useAdmin();
  const navigate = useNavigate();
  const inputId = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const query = lookupQuery(text);
    if (!query || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await admin.adminFetch(() =>
        admin.client.GET("/v1/admin/users", { params: { query } }),
      );
      if (data) void navigate(`/admin/users/${encodeURIComponent(data.id)}`);
    } catch (failure) {
      if (failure instanceof ApiProblem && failure.code === "user_not_found") setError(t("miss"));
      else if (failure instanceof ApiProblem) {
        setError(adminProblemMessage(failure, tAll as never));
      } else setError(tAll("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="lk-hero flex flex-col gap-(--space-3)">
      <h2
        id={`${inputId}-title`}
        className="m-0 font-display text-[20px] leading-tight font-bold text-ink"
      >
        {t("title")}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-(--space-3)">
        <label htmlFor={inputId} className="text-[13px] font-bold text-ink-muted">
          {t("label")}
        </label>
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 w-full rounded-lg border-2 border-stroke bg-surface-sunken px-(--space-3) text-ink focus-visible:outline-3 focus-visible:outline-focus focus-visible:outline-offset-2"
        />
        {error && (
          <p id={errorId} role="alert" className="m-0 text-[15px] text-over">
            {error}
          </p>
        )}
        <PressButton type="submit" disabled={busy || !text.trim()}>
          {busy ? t("busy") : t("button")}
        </PressButton>
      </form>
    </section>
  );
}
