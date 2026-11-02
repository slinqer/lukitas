import type { Locale } from "../../i18n/format.ts";

/**
 * What money is called around the world in each language, for the headline's marker ("Tus lukas,
 * por fin claras." → "Tu lana, por fin clara." → …, "Your money, finally clear." → "Your bucks,
 * finally clear." → …). In Spanish, Portuguese and Italian each word carries its gender and
 * number, so the words around it agree with it. The first is the prerendered one: it must match
 * the `landing.hero.headline` message.
 */
export interface MoneyWord {
  word: string;
  /** The flag of where it is said, shown after the marker; none for the plain word. */
  flag: string;
}

export interface GenderedWord extends MoneyWord {
  plural: boolean;
  feminine: boolean;
}

/** English has no agreement; the other languages' words carry their gender and number. */
export type WordOf<L extends Locale> = L extends "en" ? MoneyWord : GenderedWord;

type Words<W> = readonly [W, ...W[]];

export const MONEY_WORDS: { readonly [L in Locale]: Words<WordOf<L>> } = {
  es: [
    { word: "lukas", flag: "🇨🇴", plural: true, feminine: true }, // Colombia
    { word: "lana", flag: "🇲🇽", plural: false, feminine: true }, // México
    { word: "guita", flag: "🇦🇷", plural: false, feminine: true }, // Argentina
    { word: "pasta", flag: "🇪🇸", plural: false, feminine: true }, // España
    { word: "plata", flag: "🇨🇱", plural: false, feminine: true }, // Chile
    { word: "chavos", flag: "🇵🇷", plural: true, feminine: false }, // Puerto Rico
    { word: "pisto", flag: "🇬🇹", plural: false, feminine: false }, // Guatemala
    { word: "cuartos", flag: "🇩🇴", plural: true, feminine: false }, // República Dominicana
    { word: "reales", flag: "🇻🇪", plural: true, feminine: false }, // Venezuela
  ],
  en: [
    { word: "money", flag: "" },
    { word: "bucks", flag: "🇺🇸" }, // United States
    { word: "quid", flag: "🇬🇧" }, // United Kingdom
    { word: "loonies", flag: "🇨🇦" }, // Canada
  ],
  pt: [
    { word: "dinheiro", flag: "", plural: false, feminine: false },
    { word: "grana", flag: "🇧🇷", plural: false, feminine: true }, // Brasil
    { word: "guito", flag: "🇵🇹", plural: false, feminine: false }, // Portugal
    { word: "kumbu", flag: "🇦🇴", plural: false, feminine: false }, // Angola
  ],
  it: [
    { word: "soldi", flag: "", plural: true, feminine: false },
    { word: "grana", flag: "🇮🇹", plural: false, feminine: true }, // everywhere in Italy
    { word: "schei", flag: "🇮🇹", plural: true, feminine: false }, // Veneto
    { word: "palanche", flag: "🇮🇹", plural: true, feminine: true }, // Liguria
    { word: "franchi", flag: "🇨🇭", plural: true, feminine: false }, // Svizzera italiana
  ],
};

/** How long each word stays before the next one rolls in, in ms. */
export const MONEY_WORD_HOLD = 2800;

/**
 * The headline around a word, in pieces: before it, what stays and what agrees with it ("Tu" +
 * "s", "" + "I tuoi"); after its comma, the words that never change ("por fin"); and the last
 * word, what stays and what agrees ("clar" + "as"), before the full stop.
 */
export interface Phrase {
  lead: readonly [string, string];
  middle: string;
  last: readonly [string, string];
}

/** "a"/"o" and "s": Spanish and Portuguese endings. */
function ending({ plural, feminine }: GenderedWord): string {
  return (feminine ? "a" : "o") + (plural ? "s" : "");
}

const PHRASES: { readonly [L in Locale]: (word: WordOf<L>) => Phrase } = {
  es: (word) => ({
    lead: ["Tu", word.plural ? "s" : ""],
    middle: "por fin",
    last: ["clar", ending(word)],
  }),
  en: () => ({ lead: ["Your", ""], middle: "finally", last: ["clear", ""] }),
  pt: (word) => ({
    lead: [
      "",
      word.feminine ? (word.plural ? "As tuas" : "A tua") : word.plural ? "Os teus" : "O teu",
    ],
    middle: "finalmente",
    last: ["clar", ending(word)],
  }),
  it: ({ plural, feminine }) => ({
    lead: ["", feminine ? (plural ? "Le tue" : "La tua") : plural ? "I tuoi" : "Il tuo"],
    middle: "finalmente",
    last: ["chiar", feminine ? (plural ? "e" : "a") : plural ? "i" : "o"],
  }),
};

/** The headline's pieces around a word of that language. */
export function phraseFor<L extends Locale>(locale: L, word: WordOf<L>): Phrase {
  return PHRASES[locale](word);
}

/** The whole headline for a word, as it reads. */
export function headlineFor<L extends Locale>(locale: L, word: WordOf<L>): string {
  const { lead, middle, last } = phraseFor(locale, word);
  return `${lead.join("")} ${word.word}, ${middle} ${last.join("")}.`;
}
