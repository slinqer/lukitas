import type { ReactNode } from "react";
import { IntlProvider as UseIntlProvider } from "use-intl";
import { type ApiProblem, problemMessage, type Translator } from "../api/errors.ts";
import { CATALOGS } from "../i18n/catalog.ts";
import type { Locale } from "../i18n/format.ts";
import { intlTag } from "../i18n/format.ts";
import { reportIntlError, useLocale } from "../i18n/IntlProvider.tsx";
import adminEn from "../i18n/messages/admin.en.json" with { type: "json" };
import adminEs from "../i18n/messages/admin.es.json" with { type: "json" };

/** The panel's languages (spec §10): its operators read Spanish or English. */
export type AdminLocale = "es" | "en";

/** Spanish stays Spanish; Italian and Portuguese, with no panel copy, read English. */
export function adminLocale(locale: Locale): AdminLocale {
  return locale === "es" ? "es" : "en";
}

/** The app's messages (errors, common words) plus the panel's own `admin` namespace. */
const ADMIN_CATALOGS = {
  es: { ...CATALOGS.es, ...adminEs },
  en: { ...CATALOGS.en, ...adminEn },
} as const;

/**
 * Gives the panel's screens their messages, in Spanish or English (`adminLocale`). It stands in
 * for `AppMessages` under the admin layout: the app's messages are here too, so shared pieces
 * (error screens, `errors.*`) speak the same language as the panel around them.
 */
export function AdminMessages({ children }: { children: ReactNode }) {
  const locale = adminLocale(useLocale().locale);
  return (
    <UseIntlProvider
      locale={intlTag(locale)}
      messages={ADMIN_CATALOGS[locale]}
      onError={reportIntlError}
    >
      {children}
    </UseIntlProvider>
  );
}

/**
 * The text for a failed admin call: `admin.errors.<code>` for a code only the panel meets, else
 * the app's `errors.<code>` (or `errors.generic`).
 */
export function adminProblemMessage(problem: ApiProblem, t: Translator): string {
  const key = `admin.errors.${problem.code}`;
  return t.has(key) ? t(key) : problemMessage(problem, t);
}
