import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MainPicture } from "./CaptureDemos.tsx";

const meta = {
  title: "Capture/MainPicture",
  component: MainPicture,
  parameters: { layout: "centered" },
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
    await expect(canvas.queryByText("Nómina")).toBeNull();
  },
};

/** With the income pair too. */
export const Income: Story = {
  args: { income: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Nómina")).toHaveLength(2);
  },
};
