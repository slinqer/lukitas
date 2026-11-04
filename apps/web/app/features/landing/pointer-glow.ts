import { type RefObject, useEffect } from "react";

type Box = Pick<DOMRect, "left" | "top" | "width" | "height">;

const clamp = (value: number) => Math.min(1, Math.max(-1, value));
/** Two decimals, and never "-0". */
const round = (value: number) => String(Math.round(value * 100) / 100 + 0);

/**
 * Where a button's hover light goes for a pointer at (clientX, clientY): `x`/`y` in px from the
 * button's top-left corner (the light inside it), `leanX`/`leanY` from -1 (left/top edge) to 1
 * (right/bottom edge), how far the halo around it leans toward the pointer.
 */
export function glowAt(box: Box, clientX: number, clientY: number) {
  const x = clientX - box.left;
  const y = clientY - box.top;
  return {
    x: `${Math.round(x)}px`,
    y: `${Math.round(y)}px`,
    leanX: round(clamp((x / box.width) * 2 - 1)),
    leanY: round(clamp((y / box.height) * 2 - 1)),
  };
}

/**
 * Hands the pointer's position to the landing button under it (`--lk-glow-x/y`, `--lk-lean-x/y`),
 * so its hover light follows the mouse (landing.css). One listener for the whole page. Only mice and
 * pens: a finger has no hover. Without JavaScript the light simply sits in the middle.
 */
export function useButtonGlow(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const button = (event.target as Element | null)?.closest<HTMLElement>(".lk-btn");
      if (!button || !element.contains(button)) return;
      const glow = glowAt(button.getBoundingClientRect(), event.clientX, event.clientY);
      button.style.setProperty("--lk-glow-x", glow.x);
      button.style.setProperty("--lk-glow-y", glow.y);
      button.style.setProperty("--lk-lean-x", glow.leanX);
      button.style.setProperty("--lk-lean-y", glow.leanY);
    };
    element.addEventListener("pointermove", onMove, { passive: true });
    return () => element.removeEventListener("pointermove", onMove);
  }, [root]);
}
