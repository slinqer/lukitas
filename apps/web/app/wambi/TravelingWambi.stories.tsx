import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";
import { ENTRANCE_STORAGE_KEY } from "./entrance.ts";
import { TravelingWambi } from "./TravelingWambi.tsx";

/**
 * The landing's traveling Wambi on a small page with its two spots (the hero and the closing): he rolls in once per session, stands on the spot in view in its pose, turns
 * edge-on between spots, and hops on a tap or click (never on hover). On the landing the page mounts him only once it
 * has loaded and is idle, and never under reduced motion.
 */
/** Like the landing, he mounts once the page (and its spots) is on screen. */
function AfterThePage({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? children : null;
}

const meta = {
  title: "Wambi/TravelingWambi",
  component: TravelingWambi,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", minHeight: "260vh" }}>
        <div
          data-wambi-spot="hero"
          data-wambi-pose="wave"
          data-wambi-enter-from="right"
          style={{ width: 220, height: 220, marginInline: "auto" }}
        />
        <div style={{ height: "90vh" }} />
        <div
          data-wambi-spot="closing"
          data-wambi-pose="celebrate"
          style={{ width: 160, height: 160, marginInline: "auto" }}
        />
        <AfterThePage>
          <Story />
        </AfterThePage>
      </div>
    ),
  ],
  beforeEach: () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    sessionStorage.removeItem(ENTRANCE_STORAGE_KEY);
    return () => {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.documentElement.removeAttribute("data-wambi-live");
    };
  },
} satisfies Meta<typeof TravelingWambi>;

export default meta;
type Story = StoryObj<typeof meta>;

function layerOf(root: HTMLElement): HTMLElement {
  const layer = root.ownerDocument.querySelector<HTMLElement>("[data-wambi-traveler]");
  if (!layer) throw new Error("no traveling Wambi");
  return layer;
}

function activeSheet(layer: HTMLElement): string {
  const sprite = layer.querySelector(".lk-traveler-mood.is-active .lk-wambi-sprite");
  return sprite ? getComputedStyle(sprite).backgroundImage : "";
}

/** First visit: he rolls in (tucked into his coin), unfolds and waves, then stands on the hero. */
export const Entrance: Story = {
  play: async ({ canvasElement }) => {
    const layer = layerOf(canvasElement);
    await expect(layer).toHaveAttribute("aria-hidden", "true");
    await expect(layer.dataset.entrance).toBe("playing");
    await expect(sessionStorage.getItem(ENTRANCE_STORAGE_KEY)).toBe("seen");
    // Set on the next animation frame after he mounts.
    await waitFor(() => expect(document.documentElement.dataset.wambiLive).toBe("live"));
    await waitFor(() => expect(layer.dataset.entrance).toBe("done"), { timeout: 15_000 });
    await expect(layer.dataset.spot).toBe("hero");
    await expect(layer.dataset.pose).toBe("wave");
    await expect(activeSheet(layer)).toContain("/wambi/wave.webp");
    // Standing: the coin isn't clipped or turned any more, and the wave sheet plays.
    const body = layer.querySelector<HTMLElement>(".lk-traveler-body");
    await expect(body?.style.transform).toBe("");
    await expect(body?.style.clipPath).toBe("");
    const sprite = layer.querySelector(".lk-traveler-mood.is-active .lk-wambi-sprite");
    await expect(sprite?.classList.contains("is-playing")).toBe(true);
  },
};

/**
 * He takes each spot's pose and plays its gesture once on arriving (the closing's celebration rests
 * on frame 4), and only his body takes the pointer: a tap makes him hop.
 */
export const SpotsAndHop: Story = {
  beforeEach: () => {
    sessionStorage.setItem(ENTRANCE_STORAGE_KEY, "seen");
  },
  play: async ({ canvasElement }) => {
    const layer = layerOf(canvasElement);
    await expect(layer.dataset.entrance).toBe("skipped");
    await expect(getComputedStyle(layer).pointerEvents).toBe("none");
    const hit = layer.querySelector<HTMLElement>(".lk-traveler-hit");
    await expect(hit && getComputedStyle(hit).pointerEvents).toBe("auto");

    hit?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    await waitFor(() => expect(layer.querySelector(".lk-traveler-hop.is-hopping")).not.toBeNull());
    await waitFor(() => expect(layer.querySelector(".lk-traveler-hop.is-hopping")).toBeNull());

    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    await waitFor(() => expect(layer.dataset.pose).toBe("celebrate"));
    await expect(layer.dataset.spot).toBe("closing");
    await waitFor(() => expect(activeSheet(layer)).toContain("/wambi/celebrate.webp"));
    const celebrating = () => layer.querySelector(".lk-traveler-mood.is-active .lk-wambi-sprite");
    await expect(celebrating()).toHaveClass("is-once");
    await waitFor(() => expect(celebrating()?.getAnimations()).toHaveLength(0), { timeout: 5000 });
    // Frame 4 of the 4×2 sheet: first column, second row.
    await expect(
      celebrating() && getComputedStyle(celebrating() as Element).backgroundPosition,
    ).toBe("0% 100%");
  },
};
