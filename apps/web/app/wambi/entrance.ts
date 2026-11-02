/**
 * Wambi's entrance on the landing page, once per browser session: he rolls in on his edge (limbs
 * tucked in), settles with a little bounce facing the viewer, pops his arms and legs out, and
 * waves. Pure timing here; `entranceFrame` (traveling.ts) turns it into the 2.5D Wambi's transforms.
 */

import { readStored, type StoredArea, writeStored } from "../lib/stored.ts";

/** Phase lengths in ms (≈2 s in all). */
export const ENTRANCE_MS = {
  roll: 800,
  settle: 300,
  unfold: 400,
  wave: 500,
  total: 2000,
} as const;

export type EntrancePhaseName = "roll" | "settle" | "unfold" | "wave" | "done";

/** The phase at `elapsedMs` since the entrance started, and how far through it (0 to 1). */
export function entrancePhase(elapsedMs: number): { phase: EntrancePhaseName; progress: number } {
  let t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  for (const phase of ["roll", "settle", "unfold", "wave"] as const) {
    const length = ENTRANCE_MS[phase];
    if (t < length) return { phase, progress: t / length };
    t -= length;
  }
  return { phase: "done", progress: 1 };
}

/** Ease-out cubic: fast at first, gently arriving. */
function easeOut(p: number): number {
  return 1 - (1 - p) ** 3;
}

/**
 * The roll at `progress` (0 to 1) over `distance` px for a coin of `radius` px: how far he still
 * is from his spot (`offset`) and how much he has turned (`angle`, radians). The angle is exactly
 * the distance travelled over the radius, so he rolls without sliding; with a distance of one
 * circumference he ends upright.
 */
export function rollAt(
  progress: number,
  distance: number,
  radius: number,
): { offset: number; angle: number } {
  const p = Math.min(1, Math.max(0, progress));
  const offset = distance * (1 - easeOut(p));
  return { offset, angle: radius > 0 ? (distance - offset) / radius : 0 };
}

/**
 * The `readStored` name set (in sessionStorage, as `wambito.entrance`) once the entrance has
 * played in this browser session.
 */
export const ENTRANCE_KEY = "entrance";
/** The sessionStorage key itself. */
export const ENTRANCE_STORAGE_KEY = `wambito.${ENTRANCE_KEY}`;

/**
 * Whether to play the entrance: not yet seen this session, and the hero is still in view (a
 * visitor who already scrolled past it never sees him roll in). Unreadable storage counts as
 * not seen.
 */
export function shouldPlayEntrance(session: StoredArea | null, heroInView: boolean): boolean {
  if (!heroInView) return false;
  return readStored(ENTRANCE_KEY, session) !== "seen";
}

/** Remembers for this session that the entrance has played (silently, if storage is blocked). */
export function markEntranceSeen(session: StoredArea | null): void {
  // Private mode or blocked storage: he may roll in again next time, which is fine.
  writeStored(ENTRANCE_KEY, "seen", session);
}
