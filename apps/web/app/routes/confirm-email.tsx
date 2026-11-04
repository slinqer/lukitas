import { createTranslator } from "use-intl/core";
import { ConfirmEmail } from "../features/confirm-email/ConfirmEmail.tsx";
import { CATALOGS } from "../i18n/catalog.ts";

/** The link carries a one-time token: never indexed, and no referrer goes anywhere. */
export const meta = () => {
  const t = createTranslator({ locale: "es", messages: CATALOGS.es, namespace: "confirm_email" });
  return [
    { title: t("meta_title") },
    { name: "robots", content: "noindex" },
    { name: "referrer", content: "no-referrer" },
  ];
};

/** `/confirm-email?token=…`: confirms a new email for the account. No guard: signed in or not. */
export default function ConfirmEmailRoute() {
  return <ConfirmEmail />;
}
