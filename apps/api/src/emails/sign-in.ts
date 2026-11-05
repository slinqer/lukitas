import type { Mail } from "../mailer.ts";
import { buttonRows, C, DISPLAY, emailDocument, escapeHtml, MONO, TEXT } from "./layout.ts";

type Locale = "es" | "en" | "it" | "pt";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Copy {
  subject: (code: string) => string;
  preheader: (code: string) => string;
  heading: string;
  lead: string;
  /** The button and the line under it, for an email that carries a link. */
  button?: string | undefined;
  buttonFallback?: string | undefined;
  expiry: (minutes: number) => string;
  ignore: string;
  footer: string;
  alt: string;
}

const COPY = {
  es: {
    subject: (code: string) => `Tu código de Wambito: ${code}`,
    preheader: (code: string) => `Tu código para entrar a Wambito: ${code}`,
    heading: "¡Hola! Este es tu código para entrar",
    lead: "Escríbelo en Wambito, o toca el botón para entrar directo.",
    button: "ENTRAR A WAMBITO",
    buttonFallback: "¿El botón no funciona? Copia este enlace en tu navegador:",
    expiry: (m: number) => `El código y el enlace vencen en ${plural(m, "minuto", "minutos")}.`,
    ignore: "Si no pediste este correo, ignóralo: nadie puede entrar sin este código.",
    footer: "Wambito · gratis y de código abierto",
    alt: "Wambi saludando",
  },
  en: {
    subject: (code: string) => `Your Wambito code: ${code}`,
    preheader: (code: string) => `Your Wambito sign-in code: ${code}`,
    heading: "Hi! Here is your sign-in code",
    lead: "Type it into Wambito, or tap the button to go straight in.",
    button: "SIGN IN TO WAMBITO",
    buttonFallback: "Button not working? Copy this link into your browser:",
    expiry: (m: number) => `The code and the link expire in ${plural(m, "minute", "minutes")}.`,
    ignore: "If you didn't ask for this email, ignore it: nobody can sign in without this code.",
    footer: "Wambito · free and open source",
    alt: "Wambi waving hello",
  },
  it: {
    subject: (code: string) => `Il tuo codice Wambito: ${code}`,
    preheader: (code: string) => `Il tuo codice per entrare in Wambito: ${code}`,
    heading: "Ciao! Questo è il tuo codice per entrare",
    lead: "Scrivilo in Wambito, oppure tocca il pulsante per entrare subito.",
    button: "ENTRA IN WAMBITO",
    buttonFallback: "Il pulsante non funziona? Copia questo link nel tuo browser:",
    expiry: (m: number) => `Il codice e il link scadono tra ${plural(m, "minuto", "minuti")}.`,
    ignore: "Se non hai chiesto questa email, ignorala: nessuno può entrare senza questo codice.",
    footer: "Wambito · gratis e open source",
    alt: "Wambi che saluta",
  },
  pt: {
    subject: (code: string) => `O teu código Wambito: ${code}`,
    preheader: (code: string) => `Código para entrares em Wambito: ${code}`,
    heading: "Olá! Este é o teu código para entrar",
    lead: "Escreve-o em Wambito ou toca no botão para entrares logo.",
    button: "ENTRAR EM WAMBITO",
    buttonFallback: "O botão não funciona? Copia esta ligação para o teu navegador:",
    expiry: (m: number) =>
      `O código e a ligação expiram dentro de ${plural(m, "minuto", "minutos")}.`,
    ignore: "Se não pediste este email, ignora-o: ninguém consegue entrar sem este código.",
    footer: "Wambito · grátis e de código aberto",
    alt: "Wambi a acenar",
  },
} satisfies Record<Locale, Copy>;

/** A guest saving their progress: the code that attaches this email to their account. No link. */
const CLAIM_COPY = {
  es: {
    ...COPY.es,
    subject: (code: string) => `Tu código para guardar tu progreso: ${code}`,
    preheader: (code: string) => `Tu código para guardar tu progreso en Wambito: ${code}`,
    heading: "Tu código para guardar tu progreso",
    lead: "Escríbelo en Wambito para guardar tu progreso con este correo.",
    button: undefined,
    buttonFallback: undefined,
    expiry: (m: number) => `El código vence en ${plural(m, "minuto", "minutos")}.`,
    ignore: "Si no pediste este correo, ignóralo: nadie puede usar tu correo sin este código.",
  },
  en: {
    ...COPY.en,
    subject: (code: string) => `Your code to save your progress: ${code}`,
    preheader: (code: string) => `Your code to save your progress in Wambito: ${code}`,
    heading: "Your code to save your progress",
    lead: "Type it into Wambito to save your progress with this email.",
    button: undefined,
    buttonFallback: undefined,
    expiry: (m: number) => `The code expires in ${plural(m, "minute", "minutes")}.`,
    ignore:
      "If you didn't ask for this email, ignore it: nobody can use your email without this code.",
  },
  it: {
    ...COPY.it,
    subject: (code: string) => `Il tuo codice per salvare i tuoi progressi: ${code}`,
    preheader: (code: string) => `Il tuo codice per salvare i tuoi progressi in Wambito: ${code}`,
    heading: "Il tuo codice per salvare i tuoi progressi",
    lead: "Scrivilo in Wambito per salvare i tuoi progressi con questa email.",
    button: undefined,
    buttonFallback: undefined,
    expiry: (m: number) => `Il codice scade tra ${plural(m, "minuto", "minuti")}.`,
    ignore:
      "Se non hai chiesto questa email, ignorala: nessuno può usare la tua email senza questo codice.",
  },
  pt: {
    ...COPY.pt,
    subject: (code: string) => `O teu código para guardares o teu progresso: ${code}`,
    preheader: (code: string) => `O teu código para guardares o teu progresso em Wambito: ${code}`,
    heading: "O teu código para guardares o teu progresso",
    lead: "Escreve-o em Wambito para guardar o teu progresso com este email.",
    button: undefined,
    buttonFallback: undefined,
    expiry: (m: number) => `O código expira dentro de ${plural(m, "minuto", "minutos")}.`,
    ignore: "Se não pediste este email, ignora-o: ninguém pode usar o teu email sem este código.",
  },
} satisfies Record<Locale, Copy>;

/**
 * Signing in to let an assistant in (spec §6.1): the person is in the assistant's own browser
 * window, often on a phone where the link would open the Wambito app or another browser. So the
 * code comes first, to be typed there; the button is for a computer, where it opens the same browser.
 */
const ASSISTANT_COPY = {
  es: {
    ...COPY.es,
    subject: (code: string) => `Tu código para conectar tu asistente: ${code}`,
    preheader: (code: string) => `Tu código para conectar tu asistente a Wambito: ${code}`,
    heading: "Tu código para conectar tu asistente",
    lead: "Escríbelo en la ventana de tu asistente. En un computador también puedes tocar el botón.",
    button: "CONTINUAR EN EL NAVEGADOR",
  },
  en: {
    ...COPY.en,
    subject: (code: string) => `Your code to connect your assistant: ${code}`,
    preheader: (code: string) => `Your code to connect your assistant to Wambito: ${code}`,
    heading: "Your code to connect your assistant",
    lead: "Type it into your assistant's window. On a computer you can also tap the button.",
    button: "CONTINUE IN THE BROWSER",
  },
  it: {
    ...COPY.it,
    subject: (code: string) => `Il tuo codice per collegare il tuo assistente: ${code}`,
    preheader: (code: string) => `Il tuo codice per collegare il tuo assistente a Wambito: ${code}`,
    heading: "Il tuo codice per collegare il tuo assistente",
    lead: "Scrivilo nella finestra del tuo assistente. Da un computer puoi anche toccare il pulsante.",
    button: "CONTINUA NEL BROWSER",
  },
  pt: {
    ...COPY.pt,
    subject: (code: string) => `O teu código para ligares o teu assistente: ${code}`,
    preheader: (code: string) => `O teu código para ligares o teu assistente a Wambito: ${code}`,
    heading: "O teu código para ligares o teu assistente",
    lead: "Escreve-o na janela do teu assistente. Num computador também podes tocar no botão.",
    button: "CONTINUAR NO NAVEGADOR",
  },
} satisfies Record<Locale, Copy>;

interface CodeEmailInput {
  code: string;
  locale: Locale;
  /** The web origin (`WEB_URL`): where the mascot image and the footer link point. */
  webUrl: string;
  expiresInMinutes: number;
}

export function signInEmail(
  input: CodeEmailInput & {
    /** The magic link Better Auth built, with `lang` and `next` already on it. */
    link: string;
  },
): Omit<Mail, "to"> {
  return codeEmail(COPY[input.locale], input);
}

/** Signing in on an assistant's consent screen: the code first, the link for a computer. */
export function assistantEmail(
  input: CodeEmailInput & {
    /** The link to `/oauth/verify`, with `lang` and the consent `next` on it. */
    link: string;
  },
): Omit<Mail, "to"> {
  return codeEmail(ASSISTANT_COPY[input.locale], input);
}

/** The code a guest types to save their progress with this email (spec §4.2): code only. */
export function claimEmail(input: CodeEmailInput): Omit<Mail, "to"> {
  return codeEmail(CLAIM_COPY[input.locale], input);
}

/** The shared layout: mascot, heading, the code, then the link (when there is one) and expiry. */
function codeEmail(copy: Copy, input: CodeEmailInput & { link?: string }): Omit<Mail, "to"> {
  const web = input.webUrl.replace(/\/+$/, "");
  const code = escapeHtml(input.code);
  const expiry = escapeHtml(copy.expiry(input.expiresInMinutes));

  const text = [
    copy.heading,
    "",
    input.code,
    "",
    copy.lead,
    ...(input.link === undefined ? [] : [input.link]),
    "",
    copy.expiry(input.expiresInMinutes),
    copy.ignore,
    "",
    copy.footer,
    web,
    "",
  ].join("\n");

  // The button and the copy-this-link line, only for an email that carries a link.
  const linkRows =
    input.link === undefined
      ? ""
      : buttonRows({
          link: input.link,
          label: copy.button ?? "",
          fallback: copy.buttonFallback ?? "",
        });

  const cardRows = `<tr>
<td align="center" class="w-ink" style="font-family:${DISPLAY};font-size:26px;line-height:32px;font-weight:700;color:${C.ink};padding:0 0 8px 0;">${escapeHtml(copy.heading)}</td>
</tr>
<tr>
<td align="center" class="w-muted" style="font-family:${TEXT};font-size:16px;line-height:24px;font-weight:600;color:${C.muted};padding:0 0 24px 0;">${escapeHtml(copy.lead)}</td>
</tr>
<tr>
<td align="center" style="padding:0 0 28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:100%;"><tr>
<td align="center" class="w-code" bgcolor="${C.sunken}" style="background-color:${C.sunken};border:2px solid ${C.edge};border-radius:16px;padding:16px 20px 16px 30px;font-family:${MONO};font-size:40px;line-height:48px;font-weight:700;letter-spacing:10px;color:${C.ink};-webkit-user-select:all;user-select:all;">${code}</td>
</tr></table>
</td>
</tr>
${linkRows}<tr>
<td align="center" class="w-ink w-rule" style="border-top:2px solid ${C.stroke};padding:20px 0 0 0;font-family:${TEXT};font-size:15px;line-height:22px;font-weight:700;color:${C.ink};">${expiry}</td>
</tr>
<tr>
<td align="center" class="w-muted" style="padding:6px 0 0 0;font-family:${TEXT};font-size:14px;line-height:21px;font-weight:600;color:${C.muted};">${escapeHtml(copy.ignore)}</td>
</tr>
`;

  const html = emailDocument({
    lang: input.locale,
    title: copy.subject(input.code),
    preheader: copy.preheader(input.code),
    web,
    alt: copy.alt,
    cardRows,
    footer: copy.footer,
  });

  return { subject: copy.subject(input.code), text, html };
}
