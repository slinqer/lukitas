import { describe, expect, it } from "vitest";
import { glowAt } from "./pointer-glow.ts";

const BUTTON = { left: 100, top: 50, width: 200, height: 50 };

describe("glowAt", () => {
  it("puts the light where the pointer is, in px from the button's corner", () => {
    expect(glowAt(BUTTON, 150, 60)).toMatchObject({ x: "50px", y: "10px" });
  });

  it("leans the halo toward the pointer: -1 at the left/top edge, 1 at the right/bottom", () => {
    expect(glowAt(BUTTON, 200, 75)).toMatchObject({ leanX: "0", leanY: "0" });
    expect(glowAt(BUTTON, 100, 50)).toMatchObject({ leanX: "-1", leanY: "-1" });
    expect(glowAt(BUTTON, 300, 100)).toMatchObject({ leanX: "1", leanY: "1" });
  });

  it("keeps the lean within -1..1 when the pointer is just outside the button", () => {
    expect(glowAt(BUTTON, 90, 120)).toMatchObject({ leanX: "-1", leanY: "1" });
  });
});
