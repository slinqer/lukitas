import { describe, expect, it, vi } from "vitest";
import { confirmInBatches, confirming, reviewBatches } from "./review.ts";

describe("reviewBatches", () => {
  it("splits ids into batches of at most 50, keeping the order", () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);
    const batches = reviewBatches(ids);
    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(batches.flat()).toEqual(ids);
  });

  it("has no batch for no ids", () => {
    expect(reviewBatches([])).toEqual([]);
  });
});

describe("confirmInBatches", () => {
  const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);

  it("sends every batch, in order", async () => {
    const send = vi.fn(async (_ids: string[]) => {});
    await confirmInBatches(ids, send);
    expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([50, 50, 20]);
  });

  it("stops at the batch that fails and rejects", async () => {
    const send = vi.fn(async (_ids: string[]) => {
      if (send.mock.calls.length === 2) throw new Error("boom");
    });
    await expect(confirmInBatches(ids, send)).rejects.toThrow("boom");
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("confirming", () => {
  it("adds needsReview false to an edit of a transaction to review, even an empty one", () => {
    expect(confirming({ needsReview: true }, {})).toEqual({ needsReview: false });
    expect(confirming({ needsReview: true }, { name: "Zara" })).toEqual({
      name: "Zara",
      needsReview: false,
    });
  });

  it("leaves the edit of any other transaction as it is", () => {
    expect(confirming({ needsReview: false }, {})).toEqual({});
    expect(confirming({ needsReview: false }, { name: "Zara" })).toEqual({ name: "Zara" });
  });
});
