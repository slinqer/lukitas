import { useCallback, useState } from "react";
import { readStored, removeStored, writeStored } from "../../lib/stored.ts";

/**
 * What home remembers on this device (localStorage): which list was showing, and the nudges the
 * person put away. Storage can be missing or blocked (private mode): then nothing is remembered,
 * and nothing breaks.
 */

export type HomeView = "budgets" | "transactions";

/** `readStored` names (the keys are `wambito.home.view`, `wambito.home.dismissed.<userId>`). */
const VIEW_KEY = "home.view";
const dismissedKey = (userId: string) => `home.dismissed.${userId}`;

const read = (name: string) => readStored(name);
const write = (name: string, value: string) => writeStored(name, value);

/**
 * The navigation state that opens home on its Categorías list (the avatar menu's and the sidebar's
 * Categorías, the budgets card's button): categories live in that tab, not on a page of their own.
 */
export const SHOW_CATEGORIES = { view: "budgets" } as const satisfies { view: HomeView };

/** The list a navigation asked home to show (`SHOW_CATEGORIES`), if any. */
export function requestedView(state: unknown): HomeView | null {
  const view = (state as { view?: unknown } | null)?.view;
  return view === "budgets" || view === "transactions" ? view : null;
}

/** Forgets everything home remembers for this person (stories start from nothing). */
export function clearHomeStorage(userId: string): void {
  removeStored(VIEW_KEY);
  removeStored(dismissedKey(userId));
}

/**
 * The list home shows on phones, remembered per device once the person picks one. Movimientos
 * comes first and is the default (founder decision, 2026-10-22).
 */
export function useHomeView(): [HomeView, (view: HomeView) => void] {
  const [view, setView] = useState<HomeView>(() =>
    read(VIEW_KEY) === "budgets" ? "budgets" : "transactions",
  );
  const choose = useCallback((next: HomeView) => {
    setView(next);
    write(VIEW_KEY, next);
  }, []);
  return [view, choose];
}

/** The nudges this person put away ("Ahora no"), for good, on this device. */
export function useDismissed(userId: string): [Set<string>, (id: string) => void] {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const parsed: unknown = JSON.parse(read(dismissedKey(userId)) ?? "[]");
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  });
  const dismiss = useCallback(
    (id: string) =>
      setDismissed((current) => {
        const next = new Set(current).add(id);
        write(dismissedKey(userId), JSON.stringify([...next]));
        return next;
      }),
    [userId],
  );
  return [dismissed, dismiss];
}
