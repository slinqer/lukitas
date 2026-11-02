import { describe, expect, it } from "vitest";
import type { Locale } from "../../i18n/format.ts";
import en from "../../i18n/messages/en.json" with { type: "json" };
import es from "../../i18n/messages/es.json" with { type: "json" };
import it_ from "../../i18n/messages/it.json" with { type: "json" };
import pt from "../../i18n/messages/pt.json" with { type: "json" };
import { type GenderedWord, headlineFor, MONEY_WORDS, type WordOf } from "./money-words.ts";

const MESSAGES = { es, en, pt, it: it_ };
const LOCALES = Object.keys(MESSAGES) as Locale[];

function headlines<L extends Locale>(locale: L): string[] {
  return (MONEY_WORDS[locale] as readonly WordOf<L>[]).map((word) => headlineFor(locale, word));
}

/** The four agreements, on a made-up word, to see each form even where no word needs it yet. */
function forms(locale: "es" | "pt" | "it"): string[] {
  return [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ].map(([plural, feminine]) =>
    headlineFor(locale, { word: "x", flag: "", plural, feminine } as GenderedWord),
  );
}

describe("MONEY_WORDS", () => {
  for (const locale of LOCALES) {
    describe(locale, () => {
      it("starts with the prerendered headline", () => {
        const message = MESSAGES[locale].landing.hero.headline.replace(/<\/?mark>/g, "");
        expect(headlines(locale)[0]).toBe(message);
      });

      it("names each word once, and flags every word but the plain one", () => {
        const [first, ...rest] = MONEY_WORDS[locale];
        const words = MONEY_WORDS[locale].map((w) => w.word);
        expect(new Set(words).size).toBe(words.length);
        for (const word of rest) expect(word.flag).toMatch(/^\p{RI}\p{RI}$/u);
        expect(first.flag).toMatch(locale === "es" ? /^\p{RI}\p{RI}$/u : /^$/);
      });
    });
  }

  it("Spanish agrees in gender and number with every word", () => {
    expect(headlines("es")).toEqual([
      "Tus lukas, por fin claras.",
      "Tu lana, por fin clara.",
      "Tu guita, por fin clara.",
      "Tu pasta, por fin clara.",
      "Tu plata, por fin clara.",
      "Tus chavos, por fin claros.",
      "Tu pisto, por fin claro.",
      "Tus cuartos, por fin claros.",
      "Tus reales, por fin claros.",
    ]);
    expect(forms("es")).toEqual([
      "Tu x, por fin claro.",
      "Tu x, por fin clara.",
      "Tus x, por fin claros.",
      "Tus x, por fin claras.",
    ]);
  });

  it("English has nothing to agree", () => {
    expect(headlines("en")).toEqual([
      "Your money, finally clear.",
      "Your bucks, finally clear.",
      "Your quid, finally clear.",
      "Your loonies, finally clear.",
    ]);
  });

  it("Portuguese agrees the article, the possessive and the adjective", () => {
    expect(headlines("pt")).toEqual([
      "O teu dinheiro, finalmente claro.",
      "A tua grana, finalmente clara.",
      "O teu guito, finalmente claro.",
      "O teu kumbu, finalmente claro.",
    ]);
    expect(forms("pt")).toEqual([
      "O teu x, finalmente claro.",
      "A tua x, finalmente clara.",
      "Os teus x, finalmente claros.",
      "As tuas x, finalmente claras.",
    ]);
  });

  it("Italian agrees the article, the possessive and the adjective", () => {
    expect(headlines("it")).toEqual([
      "I tuoi soldi, finalmente chiari.",
      "La tua grana, finalmente chiara.",
      "I tuoi schei, finalmente chiari.",
      "Le tue palanche, finalmente chiare.",
      "I tuoi franchi, finalmente chiari.",
    ]);
    expect(forms("it")).toEqual([
      "Il tuo x, finalmente chiaro.",
      "La tua x, finalmente chiara.",
      "I tuoi x, finalmente chiari.",
      "Le tue x, finalmente chiare.",
    ]);
  });
});
