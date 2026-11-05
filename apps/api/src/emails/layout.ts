/**
 * The shared frame of every Wambito email (sign-in, claim, assistant, admin notices): Wambi, the
 * wordmark, a card for the content, the footer. It follows the landing: the colours of
 * docs/design/system/project/tokens.json (day inline, night in a dark-mode block), the brand fonts
 * where the client loads them, and the wordmark as an image of the landing's gradient.
 *
 * The images and fonts live in apps/web/public/email, written by
 * docs/brand/tools/gen-email-images.cjs. A changed image needs a new name: Gmail's proxy keeps
 * an image by its URL.
 */

/** The day palette of tokens.json: the inline colours, what every client shows by default. */
export const C = {
  bg: "#f7f4ff",
  surface: "#ffffff",
  sunken: "#ece6ff",
  edge: "#d6ccf5",
  stroke: "#e6defc",
  ink: "#221a47",
  muted: "#5b5285",
  brand: "#7b3df0",
  brandEdge: "#4a2bbf",
  gold: "#ffd23f",
  candy: "#e0408f",
} as const;

/** The night palette of tokens.json, for the clients that apply a dark-mode style block. */
export const N = {
  bg: "#15122b",
  surface: "#241f48",
  sunken: "#120f26",
  edge: "#0f0c22",
  stroke: "#2d2660",
  ink: "#f3f0ff",
  muted: "#b9b2e0",
  brand: "#7c4dff",
  brandEdge: "#3f22a3",
  gold: "#ffe66d",
  candy: "#ff8fd8",
} as const;

// Apple Mail, iOS Mail, Thunderbird and Outlook for Mac load the @font-face fonts; Gmail and
// Outlook on Windows do not, and fall back to Arial.
export const DISPLAY = `'Fredoka','Baloo 2',Arial,Helvetica,sans-serif`;
export const TEXT = `'Nunito',Arial,Helvetica,sans-serif`;
export const MONO = `'SFMono-Regular',Menlo,Consolas,'Courier New',monospace`;

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

/** A URL inside the style block, where HTML escapes do not apply: anything unusual is %-encoded. */
const cssUrl = (s: string) =>
  s.replace(/[^A-Za-z0-9:/._~%+-]/g, (c) =>
    c.charCodeAt(0) < 128
      ? `%${c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`
      : encodeURIComponent(c),
  );

/** Wambi's size in the email (the PNG is 3x). */
export const WAVE_SIZE = 160;
/** The wordmark's size in the email (the PNGs are 3x), as the generator prints it. */
export const WORDMARK_WIDTH = 165;
export const WORDMARK_HEIGHT = 50;
export const BUTTON_WIDTH = 300;
export const BUTTON_HEIGHT = 56;

/** Pads the preheader so clients do not pull body text in after it. */
export const PREHEADER_FILLER = "&#847;&zwnj;&nbsp;".repeat(60);

const FONTS = [
  ["Fredoka", 700, "fredoka-latin-700-normal.woff2"],
  ["Nunito", 600, "nunito-latin-600-normal.woff2"],
  ["Nunito", 700, "nunito-latin-700-normal.woff2"],
] as const;

/** The night colours, as classes. Outlook.com marks its dark mode with data-ogsc / data-ogsb. */
const nightRules = (scope: (cls: string) => string) =>
  [
    `${scope("w-bg")}{background-color:${N.bg} !important}`,
    `${scope("w-card")}{background-color:${N.surface} !important;border-color:${N.stroke} !important;border-bottom-color:${N.edge} !important}`,
    `${scope("w-ink")}{color:${N.ink} !important}`,
    `${scope("w-muted")}{color:${N.muted} !important}`,
    `${scope("w-code")}{background-color:${N.sunken} !important;border-color:${N.stroke} !important;color:${N.ink} !important}`,
    `${scope("w-btn")}{background-color:${N.brand} !important;border-bottom-color:${N.brandEdge} !important;box-shadow:0 10px 24px rgba(139,92,255,0.45) !important}`,
    `${scope("w-link")}{color:${N.candy} !important}`,
    `${scope("w-rule")}{border-top-color:${N.stroke} !important}`,
    `${scope("w-day")}{display:none !important}`,
    `${scope("w-night")}{display:block !important;max-height:none !important;overflow:visible !important}`,
  ].join("\n");

function styleBlock(web: string): string {
  const fonts = FONTS.map(
    ([family, weight, file]) =>
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(${cssUrl(`${web}/email/fonts/${file}`)}) format("woff2")}`,
  ).join("\n");
  return `<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
${fonts}
@media (prefers-color-scheme: dark) {
${nightRules((cls) => `.${cls}`)}
}
${nightRules((cls) => `[data-ogsc] .${cls}`)
  .split("\n")
  .filter((rule) => !rule.startsWith("[data-ogsc] .w-bg"))
  .join("\n")}
[data-ogsb] .w-bg{background-color:${N.bg} !important}
</style>`;
}

/** The primary button (the landing's: brand fill, the pressed-key edge, the glow) and the copy-this-link line. */
export function buttonRows(input: { link: string; label: string; fallback: string }): string {
  const link = escapeHtml(input.link);
  const label = escapeHtml(input.label);
  return `<tr>
<td align="center" style="padding:0 0 18px 0;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:${BUTTON_HEIGHT}px;v-text-anchor:middle;width:${BUTTON_WIDTH}px;" arcsize="43%" strokecolor="${C.brandEdge}" strokeweight="2px" fillcolor="${C.brand}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;letter-spacing:1px;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:100%;"><tr>
<td align="center" class="w-btn" bgcolor="${C.brand}" style="background-color:${C.brand};border-radius:24px;border-bottom:6px solid ${C.brandEdge};box-shadow:0 10px 24px rgba(123,61,240,0.28);">
<a href="${link}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:${DISPLAY};font-size:16px;line-height:24px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:24px;">${label}</a>
</td>
</tr></table>
<!--<![endif]-->
</td>
</tr>
<tr>
<td align="center" class="w-muted" style="padding:0 0 24px 0;font-family:${TEXT};font-size:13px;line-height:20px;font-weight:600;color:${C.muted};">${escapeHtml(input.fallback)}<br><a href="${link}" target="_blank" class="w-link" style="color:${C.brand};text-decoration:underline;word-break:break-all;">${link}</a></td>
</tr>
`;
}

/** The whole document: the card holds `cardRows` (already-escaped `<tr>` rows). */
export function emailDocument(input: {
  lang: string;
  title: string;
  preheader: string;
  /** The web origin (`WEB_URL`), no trailing slash: where the images, fonts and footer link point. */
  web: string;
  alt: string;
  cardRows: string;
  footer: string;
}): string {
  const { web } = input;
  const img = (file: string) => escapeHtml(`${web}/email/${file}`);
  const wordmarkStyle = `width:${WORDMARK_WIDTH}px;height:${WORDMARK_HEIGHT}px;border:0;text-decoration:none;font-family:${DISPLAY};font-size:36px;line-height:42px;font-weight:700;color:${C.candy};`;
  return `<!doctype html>
<html lang="${escapeHtml(input.lang)}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(input.title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
${styleBlock(web)}
</head>
<body class="w-bg" style="margin:0;padding:0;background-color:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;color:${C.bg};">${escapeHtml(input.preheader)}${PREHEADER_FILLER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="w-bg" bgcolor="${C.bg}" style="background-color:${C.bg};">
<tr>
<td align="center" style="padding:24px 16px 32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td align="center" style="padding:8px 0 0 0;">
<img src="${img("wambi.png")}" width="${WAVE_SIZE}" height="${WAVE_SIZE}" alt="${escapeHtml(input.alt)}" style="display:block;width:${WAVE_SIZE}px;height:${WAVE_SIZE}px;border:0;text-decoration:none;font-family:${TEXT};font-size:14px;color:${C.muted};">
</td>
</tr>
<tr>
<td align="center" style="padding:4px 0 24px 0;">
<img src="${img("wambito-day.png")}" class="w-day" width="${WORDMARK_WIDTH}" height="${WORDMARK_HEIGHT}" alt="Wambito" style="display:block;${wordmarkStyle}">
<!--[if !mso]><!--><img src="${img("wambito-night.png")}" class="w-night" width="${WORDMARK_WIDTH}" height="${WORDMARK_HEIGHT}" alt="" style="display:none;max-height:0;overflow:hidden;${wordmarkStyle}"><!--<![endif]-->
</td>
</tr>
<tr>
<td class="w-card" bgcolor="${C.surface}" style="background-color:${C.surface};border:2px solid ${C.stroke};border-bottom:5px solid ${C.edge};border-radius:24px;padding:32px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${input.cardRows}</table>
</td>
</tr>
<tr>
<td align="center" class="w-muted" style="padding:24px 16px 0 16px;font-family:${TEXT};font-size:13px;line-height:20px;font-weight:700;color:${C.muted};">${escapeHtml(input.footer)}<br><a href="${escapeHtml(web)}" target="_blank" class="w-link" style="color:${C.brand};text-decoration:underline;">${escapeHtml(web.replace(/^https?:\/\//, ""))}</a></td>
</tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td>
</tr>
</table>
</body>
</html>
`;
}
