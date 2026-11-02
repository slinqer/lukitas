import type { SupportedCurrency } from "@wambito/core";
import { useCallback, useState } from "react";
import { readStored, removeStored, sessionArea, writeStored } from "../../lib/stored.ts";

/**
 * What the person chose during onboarding that isn't on the server yet (or can't be told from it),
 * kept for the browser session so a reload doesn't lose it: the currency they picked, the chips
 * they selected, and whether they got past the categories step.
 */
export interface OnboardingDraft {
  /** A currency they chose (saved or not): from then on the step shows it, not the region's. */
  currency?: SupportedCurrency;
  /** Suggestion keys and own category ids that are chosen. */
  selected?: string[];
  /** They left the categories step (SIGUIENTE or SALTAR). */
  categoriesDone?: boolean;
  /** Suggestions they removed from the step ("Eliminar" on one not made yet). */
  hiddenSuggestions?: string[];
}

/** The `readStored` name, in sessionStorage: `wambito.onboarding.<userId>`. */
const storageKey = (userId: string) => `onboarding.${userId}`;

export function loadOnboardingDraft(userId: string): OnboardingDraft {
  try {
    const raw = readStored(storageKey(userId), sessionArea());
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? (parsed as OnboardingDraft) : {};
  } catch {
    // No storage (private mode, blocked): the session simply doesn't remember.
    return {};
  }
}

export function saveOnboardingDraft(userId: string, draft: OnboardingDraft): void {
  // No storage: see loadOnboardingDraft.
  writeStored(storageKey(userId), JSON.stringify(draft), sessionArea());
}

export function clearOnboardingDraft(userId: string): void {
  removeStored(storageKey(userId), sessionArea());
}

/** The draft of the signed-in user (null until their id is known) and a merge-and-save update. */
export function useOnboardingDraft(userId: string | undefined) {
  const [held, setHeld] = useState<{ userId: string; draft: OnboardingDraft } | null>(null);
  if (userId && held?.userId !== userId) {
    setHeld({ userId, draft: loadOnboardingDraft(userId) });
  }
  const update = useCallback(
    (patch: OnboardingDraft) =>
      setHeld((current) => {
        if (!current) return current;
        const draft = { ...current.draft, ...patch };
        saveOnboardingDraft(current.userId, draft);
        return { ...current, draft };
      }),
    [],
  );
  return [held && held.userId === userId ? held.draft : null, update] as const;
}
