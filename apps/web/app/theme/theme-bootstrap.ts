import { OLD_STORED_PREFIX, STORED_PREFIX } from "../lib/stored.ts";

export type ThemePref = "auto" | "night" | "day";
export type Theme = "night" | "day";

/** The `readStored` name of the theme preference; the key itself is `THEME_STORAGE_KEY`. */
export const THEME_STORED = "theme";
export const THEME_STORAGE_KEY = STORED_PREFIX + THEME_STORED;
/** 2b: remove, with the migration in the script below. */
const OLD_THEME_STORAGE_KEY = OLD_STORED_PREFIX + THEME_STORED;
export const THEME_PREFS: readonly ThemePref[] = ["auto", "night", "day"];

export function isThemePref(value: unknown): value is ThemePref {
  return value === "auto" || value === "night" || value === "day";
}

export function resolveTheme(pref: ThemePref, prefersDark: boolean): Theme {
  if (pref === "auto") return prefersDark ? "night" : "day";
  return pref;
}

/** What applies when nothing valid is stored: the purple night theme, whatever the OS prefers. */
export const DEFAULT_THEME_PREF: ThemePref = "night";

/**
 * Inline script placed first in `<head>`: sets `data-theme` before the first paint so a stored
 * "day" preference never flashes the default night theme. Plain ES5, no imports. Only an explicit
 * stored "auto" follows the OS; a missing or invalid value, blocked storage or no matchMedia all
 * give night. It reads the key as `readStored` does, moving an old `lukas.theme` to the new key
 * (2b: remove that migration).
 */
const NEW_KEY = JSON.stringify(THEME_STORAGE_KEY);
const OLD_KEY = JSON.stringify(OLD_THEME_STORAGE_KEY);
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var p=null;try{p=localStorage.getItem(${NEW_KEY});var o=localStorage.getItem(${OLD_KEY});if(o!==null){if(p===null){p=o;localStorage.setItem(${NEW_KEY},o)}localStorage.removeItem(${OLD_KEY})}}catch(e){}var t;if(p==="night"||p==="day"){t=p}else if(p==="auto"&&typeof matchMedia==="function"){t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"day"}else{t="night"}document.documentElement.dataset.theme=t}catch(e){}})();`;
