/**
 * What the web app keeps in the browser, under `wambito.<name>` keys. Every `localStorage` (and
 * `sessionStorage`) access goes through here. Storage can be missing or blocked (private mode):
 * then nothing is remembered and nothing throws.
 *
 * Before the rename the keys were `lukas.<name>`. A read moves an old key to the new one once
 * (2b: remove that migration once every browser has read its keys again).
 */

/** The part of `Storage` used here; tests pass a stand-in. */
export type StoredArea = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const STORED_PREFIX = "wambito.";
/** 2b: remove, with the migration. */
export const OLD_STORED_PREFIX = "lukas.";
const PREFIX = STORED_PREFIX;
const OLD_PREFIX = OLD_STORED_PREFIX;

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

/**
 * The value kept under `wambito.<name>`, or null. When only the old `lukas.<name>` exists, its value
 * moves to the new key first; when both exist the new one wins and the old one goes.
 */
export function readStored(name: string, storage: StoredArea | null = localArea()): string | null {
  let value: string | null;
  try {
    if (!storage) return null;
    value = storage.getItem(PREFIX + name);
  } catch {
    return null;
  }
  // 2b: remove this migration from lukas.<name>.
  try {
    const old = storage.getItem(OLD_PREFIX + name);
    if (old !== null) {
      if (value === null) {
        value = old;
        storage.setItem(PREFIX + name, old);
      }
      storage.removeItem(OLD_PREFIX + name);
    }
  } catch {
    // The old key stays; the next read tries again.
  }
  return value;
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

/** Forgets `wambito.<name>` (and the old `lukas.<name>`, so a later read cannot bring it back). */
export function removeStored(name: string, storage: StoredArea | null = localArea()): void {
  try {
    storage?.removeItem(PREFIX + name);
    storage?.removeItem(OLD_PREFIX + name); // 2b: remove
  } catch {
    // See above.
  }
}
