import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { CaptureSteps } from "./CaptureSteps.tsx";

const meta = {
  title: "Capture/Steps",
  component: CaptureSteps,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CaptureSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

const TITLES = [
  "Pagas como siempre",
  "Wambito la lee en tu teléfono",
  "Te avisa y tú decides",
  "Aprende tus categorías",
  "Hoy y lo que viene",
];

/** The five steps in Spanish, night theme: titles, decorative scenes and the first demo. */
export const Steps: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const headings = canvas.getAllByRole("heading", { level: 2 });
    await expect(headings.map((h) => h.textContent)).toEqual(TITLES);
    const scenes = canvasElement.querySelectorAll("img");
    await expect(scenes).toHaveLength(5);
    for (const img of scenes) {
      await expect(img).toHaveAttribute("alt", "");
      await expect(img).toHaveAttribute("aria-hidden", "true");
      await expect(img).toHaveAttribute("width", "200");
    }
    await expect(canvas.getByText("Anotado en Wambito")).toBeInTheDocument();
    await expect(canvas.getAllByText("por revisar").length).toBeGreaterThan(0);
  },
};

/** Under reduced motion nothing runs: no CSS animation, no transition. */
export const StepsReducedMotion: Story = {
  parameters: { reducedMotion: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.getAnimations({ subtree: true })).toHaveLength(0);
    for (const el of canvasElement.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      await expect(style.animationName === "none" || style.animationDuration === "0s").toBe(true);
      await expect(style.transitionDuration.split(",").every((d) => d.trim() === "0s")).toBe(true);
    }
  },
};
