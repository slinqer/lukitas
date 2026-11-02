import { detectLocale, isLocale, type Locale } from "../i18n/format.ts";
import {
  readStored as readKept,
  type StoredArea,
  sessionArea,
  writeStored,
} from "../lib/stored.ts";

/**
 * Where the tab remembers the demo's language (`wambito.demo.lang`, a `readStored` name), so a
 * reload of `/demo/insights` keeps it.
 */
export const DEMO_LANG_KEY = "demo.lang";

const asLocale = (value: string | null | undefined): Locale | null =>
  isLocale(value) ? value : null;

function readStored(storage: StoredArea | null): Locale | null {
  return asLocale(readKept(DEMO_LANG_KEY, storage));
}

/**
 * The demo's language, which also picks Valentina's money (pesos in Spanish, euros in English):
 * the landing's `?lang=`, else what this tab chose earlier (sessionStorage, so a reload of a deep
 * link like `/demo/insights` keeps it), else the browser's language.
 */
export function demoLocale(
  search: string,
  storage: StoredArea | null = sessionArea(),
  navigatorLanguage: string | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.language,
): Locale {
  return (
    asLocale(new URLSearchParams(search).get("lang")) ??
    readStored(storage) ??
    detectLocale(navigatorLanguage)
  );
}

/** Remembers the demo's language for this tab only; storage that is blocked is fine. */
export function rememberDemoLocale(
  locale: Locale,
  storage: StoredArea | null = sessionArea(),
): void {
  // Blocked storage: a reload falls back to the browser's language.
  writeStored(DEMO_LANG_KEY, locale, storage);
}
