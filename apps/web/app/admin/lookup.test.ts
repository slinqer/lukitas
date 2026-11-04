import { describe, expect, it } from "vitest";
import { lookupQuery } from "./lookup.ts";

describe("the look-up box's query", () => {
  it("sends the trimmed input as `email` when it has an @", () => {
    expect(lookupQuery("  ana@example.test \n")).toEqual({ email: "ana@example.test" });
  });

  it("sends anything else as `id`", () => {
    expect(lookupQuery(" 8f14e45f-ceea-467a-9a36-dedd4bea2543 ")).toEqual({
      id: "8f14e45f-ceea-467a-9a36-dedd4bea2543",
    });
  });

  it("sends nothing for an empty input", () => {
    expect(lookupQuery("   ")).toBeNull();
  });
});
