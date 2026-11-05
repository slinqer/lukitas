import type { Mail } from "../mailer.ts";
import { buttonRows, C, DISPLAY, emailDocument, escapeHtml, TEXT } from "./layout.ts";

/** The notices an admin action sends to the affected person (spec §7.2). */
export const ADMIN_MAIL_KINDS = [
  "email_change_link",
  "email_changed",
  "account_deleted",
  "account_suspended",
  "account_reactivated",
  "sessions_revoked",
  "assistant_revoked",
  "passkey_removed",
] as const;

export type AdminMailKind = (typeof ADMIN_MAIL_KINDS)[number];

type Locale = "es" | "en" | "it" | "pt";

export interface AdminMailExtra {
  /** The web origin (`WEB_URL`): where the mascot image and the footer link point. */
  webUrl: string;
  /** `email_change_link`: the `/confirm-email?token=…` link. */
  link?: string | undefined;
  /** `assistant_revoked`: the assistant's name. */
  assistant?: string | undefined;
  /** `passkey_removed`: the passkey's name. */
  passkey?: string | undefined;
}

interface Notice {
  /** Fixed per kind: names stay out of the subject line. */
  subject: string;
  heading: string;
  lead: (extra: AdminMailExtra) => string;
}

interface LocaleCopy {
  notices: Record<AdminMailKind, Notice>;
  button: string;
  buttonFallback: string;
  /** The closing line of every notice. Never the admin's reason. */
  privacy: string;
  footer: string;
  alt: string;
}

const COPY = {
  es: {
    notices: {
      email_change_link: {
        subject: "Confirma tu nuevo correo en Wambito",
        heading: "Confirma tu nuevo correo",
        lead: () =>
          "Toca el botón para que tu cuenta de Wambito use este correo. El enlace vence en 24 horas.",
      },
      email_changed: {
        subject: "El correo de tu cuenta de Wambito cambió",
        heading: "Tu correo cambió",
        lead: () =>
          "Tu cuenta de Wambito ya no usa este correo. Cerramos tus sesiones: entra de nuevo con el correo nuevo.",
      },
      account_deleted: {
        subject: "Eliminamos tu cuenta de Wambito",
        heading: "Eliminamos tu cuenta",
        lead: () =>
          "Borramos tu cuenta y todos tus datos. Las copias de seguridad que aún los tengan se borran solas en 14 días.",
      },
      account_suspended: {
        subject: "Tu cuenta de Wambito está suspendida",
        heading: "Tu cuenta está suspendida",
        lead: () =>
          "Por ahora no puedes entrar a Wambito. Cerramos tus sesiones y desconectamos tus asistentes.",
      },
      account_reactivated: {
        subject: "Tu cuenta de Wambito está activa otra vez",
        heading: "¡Tu cuenta está activa otra vez!",
        lead: () => "Ya puedes entrar a Wambito como siempre, con tu correo.",
      },
      sessions_revoked: {
        subject: "Cerramos tus sesiones de Wambito",
        heading: "Cerramos todas tus sesiones",
        lead: () =>
          "Saliste de Wambito en todos tus dispositivos. Para seguir, entra de nuevo con tu correo.",
      },
      assistant_revoked: {
        subject: "Desconectamos un asistente de tu cuenta de Wambito",
        heading: "Desconectamos un asistente",
        lead: ({ assistant }) =>
          `${assistant ?? "Tu asistente"} ya no puede ver ni cambiar tus finanzas en Wambito.`,
      },
      passkey_removed: {
        subject: "Quitamos una huella de tu cuenta de Wambito",
        heading: "Quitamos una huella",
        lead: ({ passkey }) =>
          passkey
            ? `Ya no puedes entrar con la huella «${passkey}». Tu correo sigue funcionando.`
            : "Ya no puedes entrar con una de tus huellas. Tu correo sigue funcionando.",
      },
    },
    button: "CONFIRMAR MI CORREO",
    buttonFallback: "¿El botón no funciona? Copia este enlace en tu navegador:",
    privacy: "Si no fuiste tú, escríbenos a privacy@wambito.com.",
    footer: "Wambito · gratis y de código abierto",
    alt: "Wambi saludando",
  },
  en: {
    notices: {
      email_change_link: {
        subject: "Confirm your new Wambito email",
        heading: "Confirm your new email",
        lead: () =>
          "Tap the button so your Wambito account uses this email. The link expires in 24 hours.",
      },
      email_changed: {
        subject: "Your Wambito email was changed",
        heading: "Your email was changed",
        lead: () =>
          "Your Wambito account no longer uses this email. We signed you out everywhere: sign in again with the new one.",
      },
      account_deleted: {
        subject: "Your Wambito account was deleted",
        heading: "We deleted your account",
        lead: () =>
          "Your account and all its data are gone. Backups that still hold them are erased within 14 days.",
      },
      account_suspended: {
        subject: "Your Wambito account is suspended",
        heading: "Your account is suspended",
        lead: () =>
          "For now you can't sign in to Wambito. We signed you out and disconnected your assistants.",
      },
      account_reactivated: {
        subject: "Your Wambito account is active again",
        heading: "Your account is active again!",
        lead: () => "You can sign in to Wambito as usual, with your email.",
      },
      sessions_revoked: {
        subject: "We signed you out of Wambito",
        heading: "We signed you out everywhere",
        lead: () =>
          "You're signed out of Wambito on all your devices. To keep going, sign in again with your email.",
      },
      assistant_revoked: {
        subject: "An assistant was disconnected from your Wambito account",
        heading: "We disconnected an assistant",
        lead: ({ assistant }) =>
          `${assistant ?? "Your assistant"} can no longer see or change your finances in Wambito.`,
      },
      passkey_removed: {
        subject: "A fingerprint was removed from your Wambito account",
        heading: "We removed a fingerprint",
        lead: ({ passkey }) =>
          passkey
            ? `You can no longer sign in with the fingerprint "${passkey}". Your email still works.`
            : "You can no longer sign in with one of your fingerprints. Your email still works.",
      },
    },
    button: "CONFIRM MY EMAIL",
    buttonFallback: "Button not working? Copy this link into your browser:",
    privacy: "If this wasn't you, write to privacy@wambito.com.",
    footer: "Wambito · free and open source",
    alt: "Wambi waving hello",
  },
  it: {
    notices: {
      email_change_link: {
        subject: "Conferma la tua nuova email Wambito",
        heading: "Conferma la tua nuova email",
        lead: () =>
          "Tocca il pulsante perché il tuo account Wambito usi questa email. Il link scade tra 24 ore.",
      },
      email_changed: {
        subject: "L'email del tuo account Wambito è cambiata",
        heading: "La tua email è cambiata",
        lead: () =>
          "Il tuo account Wambito non usa più questa email. Abbiamo chiuso tutte le tue sessioni: entra di nuovo con quella nuova.",
      },
      account_deleted: {
        subject: "Abbiamo eliminato il tuo account Wambito",
        heading: "Abbiamo eliminato il tuo account",
        lead: () =>
          "Il tuo account e tutti i tuoi dati sono stati cancellati. I backup che li contengono ancora vengono cancellati entro 14 giorni.",
      },
      account_suspended: {
        subject: "Il tuo account Wambito è sospeso",
        heading: "Il tuo account è sospeso",
        lead: () =>
          "Per ora non puoi entrare in Wambito. Abbiamo chiuso le tue sessioni e scollegato i tuoi assistenti.",
      },
      account_reactivated: {
        subject: "Il tuo account Wambito è di nuovo attivo",
        heading: "Il tuo account è di nuovo attivo!",
        lead: () => "Puoi entrare in Wambito come sempre, con la tua email.",
      },
      sessions_revoked: {
        subject: "Abbiamo chiuso le tue sessioni Wambito",
        heading: "Abbiamo chiuso tutte le tue sessioni",
        lead: () =>
          "Wambito è chiuso su tutti i tuoi dispositivi. Per continuare, entra di nuovo con la tua email.",
      },
      assistant_revoked: {
        subject: "Un assistente è stato scollegato dal tuo account Wambito",
        heading: "Abbiamo scollegato un assistente",
        lead: ({ assistant }) =>
          `${assistant ?? "Il tuo assistente"} non può più vedere né modificare le tue finanze in Wambito.`,
      },
      passkey_removed: {
        subject: "Abbiamo rimosso un'impronta dal tuo account Wambito",
        heading: "Abbiamo rimosso un'impronta",
        lead: ({ passkey }) =>
          passkey
            ? `Non puoi più entrare con l'impronta «${passkey}». La tua email funziona ancora.`
            : "Non puoi più entrare con una delle tue impronte. La tua email funziona ancora.",
      },
    },
    button: "CONFERMA LA MIA EMAIL",
    buttonFallback: "Il pulsante non funziona? Copia questo link nel tuo browser:",
    privacy: "Se non sei stato tu, scrivici a privacy@wambito.com.",
    footer: "Wambito · gratis e open source",
    alt: "Wambi che saluta",
  },
  pt: {
    notices: {
      email_change_link: {
        subject: "Confirma o teu novo email Wambito",
        heading: "Confirma o teu novo email",
        lead: () =>
          "Toca no botão para a tua conta Wambito passar a usar este email. A ligação expira dentro de 24 horas.",
      },
      email_changed: {
        subject: "O email da tua conta Wambito mudou",
        heading: "O teu email mudou",
        lead: () =>
          "A tua conta Wambito já não usa este email. Terminámos todas as tuas sessões: entra outra vez com o novo.",
      },
      account_deleted: {
        subject: "Eliminámos a tua conta Wambito",
        heading: "Eliminámos a tua conta",
        lead: () =>
          "A tua conta e todos os teus dados foram apagados. As cópias de segurança que ainda os tenham são apagadas dentro de 14 dias.",
      },
      account_suspended: {
        subject: "A tua conta Wambito está suspensa",
        heading: "A tua conta está suspensa",
        lead: () =>
          "Por agora não podes entrar em Wambito. Terminámos as tuas sessões e desligámos os teus assistentes.",
      },
      account_reactivated: {
        subject: "A tua conta Wambito está ativa outra vez",
        heading: "A tua conta está ativa outra vez!",
        lead: () => "Já podes entrar em Wambito como sempre, com o teu email.",
      },
      sessions_revoked: {
        subject: "Terminámos as tuas sessões Wambito",
        heading: "Terminámos todas as tuas sessões",
        lead: () =>
          "Saíste de Wambito em todos os teus dispositivos. Para continuar, entra outra vez com o teu email.",
      },
      assistant_revoked: {
        subject: "Desligámos um assistente da tua conta Wambito",
        heading: "Desligámos um assistente",
        lead: ({ assistant }) =>
          `${assistant ?? "O teu assistente"} já não pode ver nem alterar as tuas finanças em Wambito.`,
      },
      passkey_removed: {
        subject: "Removemos uma impressão digital da tua conta Wambito",
        heading: "Removemos uma impressão digital",
        lead: ({ passkey }) =>
          passkey
            ? `Já não podes entrar com a impressão digital «${passkey}». O teu email continua a funcionar.`
            : "Já não podes entrar com uma das tuas impressões digitais. O teu email continua a funcionar.",
      },
    },
    button: "CONFIRMAR O MEU EMAIL",
    buttonFallback: "O botão não funciona? Copia esta ligação para o teu navegador:",
    privacy: "Se não foste tu, escreve-nos para privacy@wambito.com.",
    footer: "Wambito · grátis e de código aberto",
    alt: "Wambi a acenar",
  },
} satisfies Record<Locale, LocaleCopy>;

const isLocale = (l: string): l is Locale => Object.hasOwn(COPY, l);

/**
 * A notice to the person an admin action touched, in their locale (unknown → `es`): short, never
 * the admin's reason, always ending with the privacy@wambito.com line. Only `email_change_link`
 * carries a link (and a button). The caller adds `to`, and never mails a guest's placeholder.
 */
export function adminMail(
  kind: AdminMailKind,
  locale: string,
  extra: AdminMailExtra,
): Omit<Mail, "to"> {
  const lang: Locale = isLocale(locale) ? locale : "es";
  const copy: LocaleCopy = COPY[lang];
  const notice = copy.notices[kind];
  const lead = notice.lead(extra);
  const withLink = kind === "email_change_link" && extra.link !== undefined;
  const web = extra.webUrl.replace(/\/+$/, "");

  const text = [
    notice.heading,
    "",
    lead,
    ...(withLink && extra.link ? ["", extra.link] : []),
    "",
    copy.privacy,
    "",
    copy.footer,
    web,
    "",
  ].join("\n");

  const linkRows =
    withLink && extra.link
      ? buttonRows({ link: extra.link, label: copy.button, fallback: copy.buttonFallback })
      : "";

  const cardRows = `<tr>
<td align="center" class="w-ink" style="font-family:${DISPLAY};font-size:26px;line-height:32px;font-weight:700;color:${C.ink};padding:0 0 8px 0;">${escapeHtml(notice.heading)}</td>
</tr>
<tr>
<td align="center" class="w-muted" style="font-family:${TEXT};font-size:16px;line-height:24px;font-weight:600;color:${C.muted};padding:0 0 24px 0;">${escapeHtml(lead)}</td>
</tr>
${linkRows}<tr>
<td align="center" class="w-ink w-rule" style="border-top:2px solid ${C.stroke};padding:20px 0 0 0;font-family:${TEXT};font-size:14px;line-height:21px;font-weight:700;color:${C.ink};">${escapeHtml(copy.privacy)}</td>
</tr>
`;

  const html = emailDocument({
    lang,
    title: notice.subject,
    preheader: lead,
    web,
    alt: copy.alt,
    cardRows,
    footer: copy.footer,
  });

  return { subject: notice.subject, text, html };
}
