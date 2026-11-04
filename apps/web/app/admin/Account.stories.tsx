import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTarget } from "../../.storybook/story-utils.ts";
import { createApiClient } from "../api/client.ts";
import type { components } from "../api/schema";
import AdminUserRoute from "../routes/admin.users.$id.tsx";
import { ToastProvider } from "../ui/Toast.tsx";
import { AdminGate } from "./AdminGate.tsx";
import { AdminMessages } from "./AdminMessages.tsx";
import { AdminSessionContext, createAdminSession } from "./use-admin.ts";

/**
 * One account (spec §5) against a fake API, inside the admin layout's gate: what the panel knows
 * about it (never finance data), its own audit entries, and the action sheets, each asking for a
 * reason. Sheets live in `document.body` (a portal), so they are found from there.
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": status < 300 ? "application/json" : "application/problem+json" },
  });
const problem = (status: number, code: string) =>
  json(status, { type: "about:blank", title: code, status, code });
const done = () => new Response(null, { status: 204 });

type User = components["schemas"]["AdminUser"];

const ADMIN_ID = "admin-1";
const ANA_ID = "7a1c0000-0000-4000-8000-000000000001";
const GUEST_ID = "7a1c0000-0000-4000-8000-000000000002";

const ANA: User = {
  id: ANA_ID,
  email: "ana@example.test",
  isAnonymous: false,
  locale: "es",
  createdAt: "2026-03-14T09:30:00.000Z",
  lastActiveAt: "2026-11-03T18:05:00.000Z",
  suspendedAt: null,
  sessionCount: 2,
  passkeys: [
    { id: "pk-1", name: "Pixel 9", deviceType: "multiDevice", createdAt: "2026-04-02T10:00:00Z" },
  ],
  assistants: [{ clientId: "claude", name: "Claude", consentedAt: "2026-06-20T12:00:00.000Z" }],
};

const GUEST: User = {
  ...ANA,
  id: GUEST_ID,
  email: null,
  isAnonymous: true,
  sessionCount: 1,
  passkeys: [],
  assistants: [],
};

const SUSPENDED: User = { ...ANA, suspendedAt: "2026-11-01T08:00:00.000Z", sessionCount: 0 };
const OWN: User = { ...ANA, id: ADMIN_ID, email: "admin@example.test" };

const AUDIT = {
  entries: [
    {
      id: "audit-1",
      at: "2026-11-02T11:00:00.000Z",
      adminUserId: ADMIN_ID,
      action: "sessions.revoke",
      targetUserId: ANA_ID,
      emailHash: null,
      reason: "Lost phone, asked by email",
      detail: null,
    },
  ],
  next: null,
};

const OPTIONS = {
  challenge: "c2FtcGxl",
  rpId: "wambito.test",
  userVerification: "required",
  allowCredentials: [{ id: "cred-1", type: "public-key" }],
};
const ASSERTION = {
  id: "cred-1",
  rawId: "cred-1",
  type: "public-key",
  response: { clientDataJSON: "e30", authenticatorData: "AA", signature: "AA" },
  clientExtensionResults: {},
} as const;

type Handler = (request: Request) => Response | Promise<Response>;

interface Spies {
  /** "METHOD /path?query" for every call, and its JSON body when it has one. */
  onRequest(line: string, body?: unknown): void;
}

const me = () => json(200, { id: ADMIN_ID, verifiedUntil: "2026-11-04T10:15:00.000Z" });

/** The admin layout's pieces (session, gate, toasts) around the account route, on a fake API. */
function Stage({
  user,
  handlers,
  onRequest,
}: {
  user: { id: string };
  handlers: Record<string, Handler>;
  onRequest: Spies["onRequest"];
}) {
  const [session] = useState(() => {
    const fetch = async (input: RequestInfo | URL) => {
      const request = input as Request;
      const url = new URL(request.url);
      const path = url.pathname.replace("/api", "");
      const text = request.method === "GET" ? "" : await request.clone().text();
      const line = `${request.method} ${path}${url.search}`;
      if (text) onRequest(line, JSON.parse(text));
      else onRequest(line);
      const handler = handlers[`${request.method} ${path}`];
      return handler ? handler(request) : problem(404, "not_found");
    };
    const client = createApiClient({
      fetch,
      baseUrl: "http://localhost/api",
      onUnauthorized: fn(),
    });
    return createAdminSession({ client, authenticate: async () => ASSERTION });
  });
  useEffect(() => {
    session.load().catch(() => {});
  }, [session]);
  return (
    <MemoryRouter initialEntries={[`/admin/users/${user.id}`]}>
      <AdminMessages>
        <ToastProvider>
          <AdminSessionContext value={session}>
            <Routes>
              <Route element={<AdminGate />}>
                <Route path="/admin" element={<Landed />} />
                <Route path="/admin/users/:id" element={<AdminUserRoute />} />
              </Route>
            </Routes>
          </AdminSessionContext>
        </ToastProvider>
      </AdminMessages>
    </MemoryRouter>
  );
}

function Landed() {
  return <p>Landed on {useLocation().pathname}</p>;
}

/** The usual answers for `user`: the admin, the account, its audit and 204 for every action. */
const api = (user: User, over: Record<string, Handler> = {}): Record<string, Handler> => {
  const base = `/v1/admin/users/${user.id}`;
  return {
    "GET /v1/admin/me": me,
    "GET /v1/admin/users": () => json(200, user),
    "GET /v1/admin/audit": () => json(200, AUDIT),
    [`DELETE ${base}`]: done,
    [`POST ${base}/email-change`]: done,
    [`POST ${base}/sessions/revoke`]: done,
    [`POST ${base}/suspend`]: done,
    [`POST ${base}/reactivate`]: done,
    [`DELETE ${base}/assistants/claude`]: done,
    [`DELETE ${base}/passkeys/pk-1`]: done,
    ...over,
  };
};

const meta = {
  title: "Admin/Account",
  args: { onRequest: fn() },
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone", styles: { width: "390px", height: "844px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
} satisfies Meta<Spies>;

export default meta;
type Story = StoryObj<Spies>;

const render = (user: User, over?: Record<string, Handler>): Story["render"] =>
  function Render(args) {
    return <Stage user={user} handlers={api(user, over)} onRequest={args.onRequest} />;
  };

const body = () => within(document.body);
const dialog = () => body().findByRole("dialog");
/**
 * Waits until the toast saying `text` has fully faded in, so the a11y checks after the play
 * function never measure its contrast mid-animation.
 */
const toastShown = (text: string) =>
  waitFor(
    () => {
      const toast = [...document.querySelectorAll<HTMLElement>(".lk-toast")].find((element) =>
        element.textContent?.includes(text),
      );
      expect(toast).toBeDefined();
      expect(toast && getComputedStyle(toast).opacity).toBe("1");
    },
    // On a loaded machine the toast's fade-in comes late.
    { timeout: 8000 },
  );
const calls = (spy: Spies["onRequest"]) =>
  (spy as unknown as ReturnType<typeof fn>).mock.calls as [string, unknown?][];

/** The account: email, dates, sessions, passkeys, assistants, its audit, and every action. */
export const Account: Story = {
  render: render(ANA),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "ana@example.test" });
    await expect(args.onRequest).toHaveBeenCalledWith(`GET /v1/admin/users?id=${ANA_ID}`);
    await expect(args.onRequest).toHaveBeenCalledWith(`GET /v1/admin/audit?targetUserId=${ANA_ID}`);
    await expect(canvas.getByText(ANA_ID)).toBeVisible();
    await expect(canvas.getByText("Activa")).toBeVisible();
    const sessions = canvas.getByText("Sesiones abiertas").parentElement as HTMLElement;
    await expect(sessions).toHaveTextContent("2");
    const passkeys = within(canvas.getByRole("list", { name: "Passkeys" }));
    await expect(passkeys.getByText("Pixel 9")).toBeVisible();
    const assistants = within(canvas.getByRole("list", { name: "Asistentes conectados" }));
    await expect(assistants.getByText("Claude")).toBeVisible();
    const audit = within(await canvas.findByRole("list", { name: "Registro de esta cuenta" }));
    await expect(audit.getByText("Lost phone, asked by email")).toBeVisible();
    for (const name of [
      "Cambiar el correo",
      "Cerrar sesión en todas partes",
      "Suspender",
      "Eliminar la cuenta",
    ]) {
      const button = canvas.getByRole("button", { name });
      await expect(button).toBeEnabled();
      await expectTarget(button);
    }
    await expect(canvas.queryByRole("button", { name: "Reactivar" })).toBeNull();
  },
};

/** A guest: "Invitado", never the placeholder address, and no email to change. */
export const GuestAccount: Story = {
  render: render(GUEST),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "Invitado" });
    await expect(canvas.queryByText(/@/)).toBeNull();
    await expect(canvas.queryByText(/\.invalid/)).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Cambiar el correo" })).toBeNull();
    await expect(canvas.getByText("Sin passkeys.")).toBeVisible();
    await expect(canvas.getByText("Ningún asistente conectado.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Eliminar la cuenta" })).toBeEnabled();
  },
};

/** Suspended: since when, and "Reactivar" in place of "Suspender". */
export const SuspendedAccount: Story = {
  render: render(SUSPENDED),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "ana@example.test" });
    await expect(canvas.getByText(/^Suspendida desde/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reactivar" })).toBeEnabled();
    await expect(canvas.queryByRole("button", { name: "Suspender" })).toBeNull();
  },
};

/** The admin's own account: delete and suspend are off, with a note saying why. */
export const OwnAccount: Story = {
  render: render(OWN),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "admin@example.test" });
    const note = canvas.getByText(
      "Es tu propia cuenta: no puedes eliminarla ni suspenderla desde aquí.",
    );
    for (const name of ["Eliminar la cuenta", "Suspender"]) {
      const button = canvas.getByRole("button", { name });
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute("aria-describedby", note.id);
    }
    await expect(
      canvas.getByRole("button", { name: "Cerrar sesión en todas partes" }),
    ).toBeEnabled();
  },
};

/**
 * The action meets a stale verification (401): the passkey screen comes up, and once confirmed
 * the sheet is back with the reason still typed, and the retried request carries it.
 */
export const KeepsTheReasonAfterReVerifying: Story = {
  name: "keeps the reason after re-verifying",
  render: (args) => {
    let revokes = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    (window as { __releaseRevoke?: () => void }).__releaseRevoke = () => release();
    const handlers = api(ANA, {
      "POST /v1/admin/verify/options": () => json(200, OPTIONS),
      "POST /v1/admin/verify": () => json(200, { verifiedUntil: "2026-11-04T10:30:00.000Z" }),
      [`POST /v1/admin/users/${ANA_ID}/sessions/revoke`]: async () => {
        revokes += 1;
        if (revokes === 1) return problem(401, "admin_verification_required");
        await held;
        return done();
      },
    });
    return <Stage user={ANA} handlers={handlers} onRequest={args.onRequest} />;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Cerrar sesión en todas partes" }),
    );
    const sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Lost phone, ticket 42");
    await userEvent.click(sheet.getByRole("button", { name: "Cerrar las sesiones" }));
    // The 401: the passkey screen, with the sheet out of the way.
    const confirm = await canvas.findByRole("button", { name: "Confirmar con tu passkey" });
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await userEvent.click(confirm);
    // Verified: the sheet is back, still holding the reason, while the retry is on its way.
    const back = within(await dialog());
    await expect(back.getByRole("textbox", { name: "Motivo" })).toHaveValue(
      "Lost phone, ticket 42",
    );
    const revokeCalls = () =>
      calls(args.onRequest).filter(([line]) => line.endsWith("/sessions/revoke"));
    await waitFor(() => expect(revokeCalls()).toHaveLength(2));
    for (const [, sent] of revokeCalls()) {
      await expect(sent).toEqual({ reason: "Lost phone, ticket 42" });
    }
    (window as { __releaseRevoke?: () => void }).__releaseRevoke?.();
    // Done: the sheet closes, a confirmation, and the view is asked for again.
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await toastShown("Sesiones cerradas.");
    await waitFor(() =>
      expect(
        calls(args.onRequest).filter(([line]) => line.startsWith("GET /v1/admin/users")),
      ).toHaveLength(2),
    );
  },
};

/** The reason is required, counted to 300, and the sheet says to leave personal data out. */
export const ReasonRequired: Story = {
  render: render(ANA),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Suspender" }));
    const sheet = within(await dialog());
    const reason = sheet.getByRole("textbox", { name: "Motivo" });
    await expect(reason).toHaveAccessibleDescription(/Sin datos personales aquí/);
    await expect(reason).toHaveAttribute("maxlength", "300");
    const submit = sheet.getByRole("button", { name: "Suspender la cuenta" });
    await expect(submit).toBeDisabled();
    await userEvent.type(reason, "   ");
    await expect(submit).toBeDisabled();
    await userEvent.type(reason, "Chargeback abuse");
    await expect(sheet.getByText("19/300")).toBeVisible();
    await expect(submit).toBeEnabled();
  },
};

/** Delete asks for the account's email (case and spaces aside), then goes home and says so. */
export const DeleteAccount: Story = {
  render: render(ANA),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Eliminar la cuenta" }));
    const sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Asked by email");
    const submit = sheet.getByRole("button", { name: "Sí, eliminar la cuenta" });
    await expect(submit).toBeDisabled();
    const confirm = sheet.getByRole("textbox", {
      name: "Para confirmar, escribe el correo de la cuenta",
    });
    await userEvent.type(confirm, "ana@example");
    await expect(submit).toBeDisabled();
    await userEvent.type(confirm, ".TEST ");
    await expect(submit).toBeEnabled();
    // A double tap sends one DELETE.
    await userEvent.dblClick(submit);
    await expect(await canvas.findByText("Landed on /admin")).toBeVisible();
    await toastShown("Cuenta eliminada.");
    const deletes = calls(args.onRequest).filter(([line]) => line.startsWith("DELETE"));
    await expect(deletes).toEqual([
      [
        `DELETE /v1/admin/users/${ANA_ID}`,
        { reason: "Asked by email", confirm: "ana@example.TEST " },
      ],
    ]);
  },
};

/** A guest is confirmed by its id. */
export const DeleteGuest: Story = {
  render: render(GUEST),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Eliminar la cuenta" }));
    const sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Abuse report");
    const confirm = sheet.getByRole("textbox", {
      name: "Para confirmar, escribe el id de la cuenta",
    });
    await userEvent.type(confirm, GUEST_ID);
    await expect(sheet.getByRole("button", { name: "Sí, eliminar la cuenta" })).toBeEnabled();
  },
};

/** The new email is taken: the error stays in the sheet, with what was typed. */
export const ChangeEmailTaken: Story = {
  render: render(ANA, {
    [`POST /v1/admin/users/${ANA_ID}/email-change`]: () => problem(409, "email_taken"),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Cambiar el correo" }));
    const sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Nuevo correo" }), "ana@new.test");
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Lost mailbox, ID seen");
    await userEvent.click(sheet.getByRole("button", { name: "Enviar el enlace" }));
    await expect(await sheet.findByRole("alert")).toHaveTextContent(
      "Otra cuenta ya tiene ese correo.",
    );
    await expect(sheet.getByRole("textbox", { name: "Motivo" })).toHaveValue(
      "Lost mailbox, ID seen",
    );
    await expect(args.onRequest).toHaveBeenCalledWith(
      `POST /v1/admin/users/${ANA_ID}/email-change`,
      { newEmail: "ana@new.test", reason: "Lost mailbox, ID seen" },
    );
  },
};

/** Disconnecting one assistant and removing one passkey name what goes, then reload the view. */
export const RevokeAssistantAndPasskey: Story = {
  render: render(ANA),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Desconectar Claude" }));
    let sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Asked by the person");
    await userEvent.click(sheet.getByRole("button", { name: "Desconectar" }));
    await toastShown("Asistente desconectado.");
    await expect(args.onRequest).toHaveBeenCalledWith(
      `DELETE /v1/admin/users/${ANA_ID}/assistants/claude`,
      { reason: "Asked by the person" },
    );
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await userEvent.click(canvas.getByRole("button", { name: "Quitar Pixel 9" }));
    sheet = within(await dialog());
    await userEvent.type(sheet.getByRole("textbox", { name: "Motivo" }), "Lost device");
    await userEvent.click(sheet.getByRole("button", { name: "Quitar la passkey" }));
    await toastShown("Passkey quitada.");
    await expect(args.onRequest).toHaveBeenCalledWith(
      `DELETE /v1/admin/users/${ANA_ID}/passkeys/pk-1`,
      { reason: "Lost device" },
    );
  },
};

/** An id that matches no account: said plainly, with the way back. */
export const AccountNotFound: Story = {
  render: render(ANA, { "GET /v1/admin/users": () => problem(404, "user_not_found") }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Ninguna cuenta coincide.");
    await expect(canvas.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/admin");
  },
};

/** The same screen in English, by day (contrast is checked in both themes). */
export const AccountDayEnglish: Story = {
  globals: { theme: "day", locale: "en" },
  render: render(GUEST),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "Guest" });
    await expect(canvas.getByRole("button", { name: "Sign out everywhere" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Delete the account" })).toBeVisible();
  },
};
