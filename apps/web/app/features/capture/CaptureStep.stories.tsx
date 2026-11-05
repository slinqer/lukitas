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

const play =
  (title: string, demo: string | null): Story["play"] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(title);
    await expect(canvasElement.querySelector("img")).toHaveAttribute("alt", "");
    if (demo) await expect(canvas.getAllByText(demo).length).toBeGreaterThan(0);
  };

export const Pay: Story = {
  args: { step: "pay" },
  play: play("Pagas como siempre", "Anotado en Wambito"),
};
export const Reads: Story = {
  args: { step: "reads" },
  play: play("Wambito la lee en tu teléfono", "Hoy"),
};
export const Decide: Story = {
  args: { step: "decide" },
  play: play("Te avisa y tú decides", "Bien"),
};
export const Learns: Story = {
  args: { step: "learns" },
  play: play("Aprende tus categorías", "Restaurante"),
};
export const Next: Story = {
  args: { step: "next" },
  play: play("Hoy y lo que viene", null),
};
