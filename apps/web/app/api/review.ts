/** The most ids one `POST /v1/transactions/review` takes. */
export const REVIEW_BATCH = 50;

/** Ids in batches the API accepts, the order kept. */
export function reviewBatches(ids: string[]): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += REVIEW_BATCH) batches.push(ids.slice(i, i + REVIEW_BATCH));
  return batches;
}

/** Confirms `ids` one batch after another; the first batch that fails stops the rest. */
export async function confirmInBatches(
  ids: string[],
  send: (batch: string[]) => Promise<void>,
): Promise<void> {
  for (const batch of reviewBatches(ids)) await send(batch);
}

/**
 * Saving an edit of a transaction to review also confirms it (as on the phone), so the API learns
 * the category and the mark goes, even when nothing else changed.
 */
export function confirming<P extends object>(
  tx: { needsReview: boolean },
  patch: P,
): P | (P & { needsReview: false }) {
  return tx.needsReview ? { ...patch, needsReview: false } : patch;
}
