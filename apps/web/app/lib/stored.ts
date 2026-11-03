/**
 * What the web app keeps in the browser, under `wambito.<name>` keys. Every `localStorage` (and
 * `sessionStorage`) access goes through here. Storage can be missing or blocked (private mode):
 * then nothing is remembered and nothing throws.
 */

/** The part of `Storage` used here; tests pass a stand-in. */
export type StoredArea = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORED_PREFIX = "wambito.";
const PREFIX = STORED_PREFIX;

/** `localStorage`, or null where it is missing or blocked. */
export function localArea(): StoredArea | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** `sessionStorage`, or null where it is missing or blocked. */
export function sessionArea(): StoredArea | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** The value kept under `wambito.<name>`, or null. */
export function readStored(name: string, storage: StoredArea | null = localArea()): string | null {
  try {
    return storage ? storage.getItem(PREFIX + name) : null;
  } catch {
    return null;
  }
}

/** Keeps `value` under `wambito.<name>`; blocked storage just doesn't keep it. */
export function writeStored(
  name: string,
  value: string,
  storage: StoredArea | null = localArea(),
): void {
  try {
    storage?.setItem(PREFIX + name, value);
  } catch {
    // Not kept; see above.
  }
}

/** Forgets `wambito.<name>`. */
export function removeStored(name: string, storage: StoredArea | null = localArea()): void {
  try {
    storage?.removeItem(PREFIX + name);
  } catch {
    // See above.
  }
}
