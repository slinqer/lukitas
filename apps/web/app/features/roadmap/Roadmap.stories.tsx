import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { Roadmap } from "./Roadmap.tsx";

const meta = {
  title: "Roadmap/Roadmap",
  component: Roadmap,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Roadmap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page in Spanish, night theme: a column per status that has items, the demo under "Ya está". */
export const Page: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Lo que viene");
    await expect(canvas.getByText(/Puede cambiar con el tiempo/)).toBeVisible();
    const columns = canvas.getAllByRole("heading", { level: 2 });
    await expect(columns.map((heading) => heading.textContent)).toEqual([
      "Ya está",
      "En construcción",
      "Próximo",
      "Más adelante",
    ]);
    await expect(canvas.getByRole("heading", { name: "Conecta tu IA" })).toBeVisible();
  },
};

/** The page in English, day theme. */
export const PageDayEnglish: Story = {
  globals: { theme: "day", locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("What's next");
    await expect(canvas.getByRole("heading", { name: "Being built" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "iPhone app" })).toBeVisible();
  },
};
