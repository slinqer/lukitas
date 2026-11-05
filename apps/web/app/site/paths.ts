import type { Locale } from "../i18n/format.ts";

/** Each locale's landing page. Spanish is the default (and `x-default`). */
export const LANDING_PATH: Record<Locale, string> = {
  es: "/",
  en: "/en",
  it: "/it",
  pt: "/pt",
};

/** Each locale's roadmap page: English URLs, and Spanish has no prefix, like the landing. */
export const ROADMAP_PATH: Record<Locale, string> = {
  es: "/roadmap",
  en: "/en/roadmap",
  it: "/it/roadmap",
  pt: "/pt/roadmap",
};

/** Each locale's privacy policy. */
export const PRIVACY_PATH: Record<Locale, string> = {
  es: "/privacy",
  en: "/en/privacy",
  it: "/it/privacy",
  pt: "/pt/privacy",
};

/** Each locale's account deletion page. */
export const DELETE_ACCOUNT_PATH: Record<Locale, string> = {
  es: "/delete-account",
  en: "/en/delete-account",
  it: "/it/delete-account",
  pt: "/pt/delete-account",
};

/** Each locale's "how automatic capture works" page. */
export const AUTOMATIC_CAPTURE_PATH: Record<Locale, string> = {
  es: "/automatic-capture",
  en: "/en/automatic-capture",
  it: "/it/automatic-capture",
  pt: "/pt/automatic-capture",
};

/** The public, prerendered pages of the site. */
export type SitePage = "landing" | "roadmap" | "privacy" | "deleteAccount" | "automaticCapture";

export const SITE_PAGES: readonly SitePage[] = [
  "landing",
  "roadmap",
  "privacy",
  "deleteAccount",
  "automaticCapture",
];

/** Where each public page lives, per language. */
export const PAGE_PATH: Record<SitePage, Record<Locale, string>> = {
  landing: LANDING_PATH,
  roadmap: ROADMAP_PATH,
  privacy: PRIVACY_PATH,
  deleteAccount: DELETE_ACCOUNT_PATH,
  automaticCapture: AUTOMATIC_CAPTURE_PATH,
};
