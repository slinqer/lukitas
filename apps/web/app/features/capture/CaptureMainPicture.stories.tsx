import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MainPicture } from "./CaptureDemos.tsx";

const meta = {
  title: "Capture/MainPicture",
  component: MainPicture,
} satisfies Meta<typeof MainPicture>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bank's notification becomes a movement marked "por revisar". */
export const Night: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Revolut")).toBeInTheDocument();
    await expect(canvas.getAllByText("Pastelaria Aurora")).toHaveLength(2);
    await expect(canvas.getByText("Anotado en Wambito")).toBeInTheDocument();
    await expect(canvas.getByText("por revisar")).toBeInTheDocument();
    await expect(canvas.getAllByText(/^(💳 )?−12,50\s€$/)).toHaveLength(2);
    await expect(canvas.queryByText("Nómina")).toBeNull();
  },
};

/**
 * Day theme: the bank's notification is a light card with dark words, as Android's own
 * notifications follow the phone's mode (at night it is the brand's plum).
 */
export const Day: Story = {
  globals: { theme: "day" },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>(".lk-capture-notif");
    await expect(card).not.toBeNull();
    const root = getComputedStyle(document.documentElement);
    const surface = root.getPropertyValue("--surface").trim();
    const plum = root.getPropertyValue("--brand-plum").trim();
    const probe = document.createElement("div");
    document.body.append(probe);
    probe.style.color = surface;
    const surfaceRgb = getComputedStyle(probe).color;
    probe.style.color = plum;
    const plumRgb = getComputedStyle(probe).color;
    probe.remove();
    const background = getComputedStyle(card as HTMLElement).backgroundColor;
    await expect(background).toBe(surfaceRgb);
    await expect(background).not.toBe(plumRgb);
  },
};

/** With the income pair too. */
export const Income: Story = {
  args: { income: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Nómina")).toHaveLength(2);
    await expect(canvas.getAllByText(/^(💳 )?\+1\.?200,00\s€$/)).toHaveLength(2);
    await expect(canvas.getByText(/Otros ingresos/)).toBeInTheDocument();
  },
};
