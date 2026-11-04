import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTarget } from "../../../.storybook/story-utils.ts";
import { ApiProvider } from "../../api/ApiProvider.tsx";
import { ToastProvider } from "../../ui/Toast.tsx";
import { ConfirmEmail } from "./ConfirmEmail.tsx";

const problem = (status: number, code: string) =>
  new Response(JSON.stringify({ type: "about:blank", title: code, status, code }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });

/** `POST /v1/email-change/confirm` answering `respond`; the spy records each request's body. */
function confirmApi(respond: () => Response, bodies: unknown[] = []) {
  return fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    bodies.push(await request.clone().json());
    if (new URL(request.url).pathname !== "/api/v1/email-change/confirm") {
      return new Response(null, { status: 404 });
    }
    return respond();
  });
}

/** The page inside a router at `entry`, with an API whose `fetch` is the story's fake. */
function Stage({ fetch, entry }: { fetch: typeof globalThis.fetch; entry: string }) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <ApiProvider fetch={fetch}>
        <ToastProvider>
          <ConfirmEmail />
        </ToastProvider>
      </ApiProvider>
    </MemoryRouter>
  );
}

const meta = {
  title: "ConfirmEmail",
  component: Stage,
  args: {
    fetch: confirmApi(() => new Response(null, { status: 204 })),
    entry: "/confirm-email?token=tok-123",
  },
} satisfies Meta<typeof Stage>;

export default meta;
type Story = StoryObj<typeof meta>;

const tapConfirm = async (canvas: ReturnType<typeof within>) => {
  const button = await canvas.findByRole("button", { name: "Confirmar mi nuevo email" });
  await expectTarget(button);
  await userEvent.click(button);
};

/** Opening the link spends nothing: a scanner that loads the page leaves the token for the person. */
export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Confirma tu nuevo email" }),
    ).toBeVisible();
    await expectTarget(canvas.getByRole("button", { name: "Confirmar mi nuevo email" }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(args.fetch).not.toHaveBeenCalled();
  },
};

/** One tap sends the token; then the person signs in again (every session was closed). */
const sentBodies: unknown[] = [];

export const Done: Story = {
  args: { fetch: confirmApi(() => new Response(null, { status: 204 }), sentBodies) },
  play: async ({ canvasElement, args }) => {
    sentBodies.length = 0;
    const canvas = within(canvasElement);
    await tapConfirm(canvas);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Listo. Entra con tu nuevo email." }),
    ).toBeVisible();
    const link = canvas.getByRole("link", { name: "Ir a entrar" });
    await expect(link).toHaveAttribute("href", "/sign-in");
    await expectTarget(link);
    await expect(args.fetch).toHaveBeenCalledTimes(1);
    await expect(sentBodies).toEqual([{ token: "tok-123" }]);
    await expect(canvas.queryByRole("button", { name: "Confirmar mi nuevo email" })).toBeNull();
  },
};

export const Expired: Story = {
  args: { fetch: confirmApi(() => problem(410, "link_expired")) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tapConfirm(canvas);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Este enlace ya no sirve" }),
    ).toBeVisible();
    await expect(canvas.getByText(/privacy@wambito\.com/)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Confirmar mi nuevo email" })).toBeNull();
  },
};

export const Taken: Story = {
  args: { fetch: confirmApi(() => problem(409, "email_taken")) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tapConfirm(canvas);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Ese email ya tiene una cuenta" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Ir a entrar" })).toBeNull();
  },
};

/** Any other failure stays on the page with its message, and the button tries again. */
export const Failed: Story = {
  args: { fetch: confirmApi(() => problem(429, "too_many_requests")) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tapConfirm(canvas);
    await waitFor(() => expect(canvas.getByRole("alert")).toBeVisible());
    await expect(canvas.getByRole("button", { name: "Confirmar mi nuevo email" })).toBeEnabled();
  },
};

/** A link cut short: nothing to send, and no button. */
export const NoToken: Story = {
  args: { entry: "/confirm-email" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Falta el enlace" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Confirmar mi nuevo email" })).toBeNull();
    await expect(args.fetch).not.toHaveBeenCalled();
  },
};
