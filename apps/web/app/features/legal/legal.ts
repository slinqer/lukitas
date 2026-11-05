/** The sections of the privacy policy, in the order the page shows them. */
export const PRIVACY_SECTIONS = [
  "controller",
  "data",
  "purposes",
  "storage",
  "not_done",
  "voice",
  "capture",
  "assistants",
  "guest",
  "self_hosted",
  "rights",
  "changes",
] as const;

/** The sections of the account deletion page, in order. */
export const DELETE_ACCOUNT_SECTIONS = ["in_app", "by_email", "what_goes", "backups"] as const;

export type LegalPageName = "privacy" | "deleteAccount";

/** Each page's namespace under `legal` in the site catalogs. */
export const LEGAL_MESSAGES = {
  privacy: "privacy",
  deleteAccount: "delete_account",
} as const satisfies Record<LegalPageName, string>;

/** The one address for privacy requests and account deletion by email. */
export const PRIVACY_EMAIL = "privacy@wambito.com";
