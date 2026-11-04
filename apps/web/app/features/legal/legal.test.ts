import { describe, expect, it } from "vitest";
import en from "../../i18n/messages/en.json" with { type: "json" };
import es from "../../i18n/messages/es.json" with { type: "json" };
import itMessages from "../../i18n/messages/it.json" with { type: "json" };
import ptMessages from "../../i18n/messages/pt.json" with { type: "json" };
import { DELETE_ACCOUNT_SECTIONS, LEGAL_MESSAGES, PRIVACY_SECTIONS } from "./legal.ts";

type Section = { title?: string; body?: string };
type Legal = {
  title?: string;
  version?: string;
  sections?: Record<string, Section>;
};

const CATALOGS = { es, en, it: itMessages, pt: ptMessages } as const;
const PAGES = { privacy: PRIVACY_SECTIONS, deleteAccount: DELETE_ACCOUNT_SECTIONS } as const;

function legal(locale: keyof typeof CATALOGS, page: keyof typeof PAGES): Legal {
  const tree = CATALOGS[locale].legal as unknown as Record<string, Legal>;
  return tree[LEGAL_MESSAGES[page]] ?? {};
}

describe("legal pages", () => {
  it("list their sections in the agreed order", () => {
    expect(PRIVACY_SECTIONS).toEqual([
      "controller",
      "data",
      "purposes",
      "storage",
      "not_done",
      "voice",
      "assistants",
      "guest",
      "self_hosted",
      "rights",
      "changes",
    ]);
    expect(DELETE_ACCOUNT_SECTIONS).toEqual(["in_app", "by_email", "what_goes", "backups"]);
  });

  for (const locale of Object.keys(CATALOGS) as (keyof typeof CATALOGS)[]) {
    describe(locale, () => {
      for (const page of Object.keys(PAGES) as (keyof typeof PAGES)[]) {
        it(`${page}: has a title, a version line and every section, none empty`, () => {
          const messages = legal(locale, page);
          expect(messages.title?.trim()).toBeTruthy();
          expect(messages.version?.trim()).toBeTruthy();
          expect(Object.keys(messages.sections ?? {})).toEqual([...PAGES[page]]);
          for (const key of PAGES[page]) {
            const section = messages.sections?.[key];
            expect(section?.title?.trim(), `${key}.title`).toBeTruthy();
            expect(section?.body?.trim(), `${key}.body`).toBeTruthy();
          }
        });
      }

      it("privacy: names the controller, the law and the contact", () => {
        const sections = legal(locale, "privacy").sections ?? {};
        expect(sections.controller?.body).toContain("privacy@wambito.com");
        expect(sections.rights?.body).toContain("privacy@wambito.com");
        expect(sections.controller?.body).toContain("Slinqer S.A.S.");
        expect(sections.controller?.body).toContain("1581");
      });

      it("says backups go within 14 days, on both pages", () => {
        expect(legal(locale, "privacy").sections?.storage?.body).toContain("14");
        expect(legal(locale, "deleteAccount").sections?.backups?.body).toContain("14");
      });

      it("deletion by email names the contact", () => {
        expect(legal(locale, "deleteAccount").sections?.by_email?.body).toContain(
          "privacy@wambito.com",
        );
      });
    });
  }
});
