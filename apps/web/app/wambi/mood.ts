import type { MonthSummary } from "@wambito/core";

export type WambiMood = "happy" | "worried" | "celebrating";

/**
 * Wambi mirrors the month: celebrating right after a celebration-worthy event (a save, a payment,
 * a month closed in green), worried while any category is near or over its limit, happy otherwise.
 * The celebrating flag wins, so a save still gets its moment in a tight month.
 */
export function moodFor(summary: MonthSummary, celebrating: boolean): WambiMood {
  if (celebrating) return "celebrating";
  return summary.categories.some((c) => c.state !== "ok") ? "worried" : "happy";
}
