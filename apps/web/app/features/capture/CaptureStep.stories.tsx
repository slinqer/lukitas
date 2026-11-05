import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { CaptureStepView } from "./CaptureSteps.tsx";

const meta = {
  title: "Capture/Step",
  component: CaptureStepView,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CaptureStepView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The step's title, its decorative scene, and the text its demo shows (none: no demo at all). */
const play =
  (title: string, demo: RegExp | null): Story["play"] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(title);
    const scene = canvasElement.querySelector("img");
    await expect(scene).toHaveAttribute("alt", "");
    await expect(scene).toHaveAttribute("aria-hidden", "true");
    await expect(scene).toHaveAttribute("width", "200");
    if (demo) await expect(canvas.getAllByText(demo).length).toBeGreaterThan(0);
    else await expect(canvasElement.querySelector(".lk-capture-demo")).toBeNull();
  };

export const Pay: Story = {
  args: { step: "pay" },
  play: play("Pagas como siempre", /^Anotado en Wambito$/),
};
export const Reads: Story = {
  args: { step: "reads" },
  play: async (context) => {
    await play("Wambito la lee en tu teléfono", /^Hoy$/)?.(context);
    // The chip is the amount alone: no sign.
    await expect(within(context.canvasElement).getByText(/^12,50\s€$/)).toBeInTheDocument();
    await expect(within(context.canvasElement).queryByText(/\+/)).toBeNull();
  },
};
export const Decide: Story = {
  args: { step: "decide" },
  play: play(
    "Te avisa y tú decides",
    /^Anoté −12,50\s€ en Pastelaria Aurora · Otros gastos, ¿qué categoría\?$/,
  ),
};
export const Learns: Story = {
  args: { step: "learns" },
  play: play("Aprende tus categorías", /^Restaurante$/),
};
export const Next: Story = {
  args: { step: "next" },
  play: play("Hoy y lo que viene", null),
};
