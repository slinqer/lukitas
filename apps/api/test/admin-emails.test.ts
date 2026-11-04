import { describe, expect, test } from "vitest";
import { ADMIN_MAIL_KINDS, adminMail } from "../src/emails/admin.ts";

const WEB = "http://localhost:5173";
const LOCALES = ["es", "en", "it", "pt"] as const;

/** The closing line every notice ends with (spec §7.2), in each language. */
const PRIVACY = {
  es: "Si no fuiste tú, escríbenos a privacy@wambito.com.",
  en: "If this wasn't you, write to privacy@wambito.com.",
  it: "Se non sei stato tu, scrivici a privacy@wambito.com.",
  pt: "Se não foste tu, escreve-nos para privacy@wambito.com.",
} as const;

const extra = {
  webUrl: WEB,
  link: `${WEB}/confirm-email?token=abc`,
  assistant: "Claude",
  passkey: "Laptop",
};

describe("adminMail", () => {
  for (const locale of LOCALES) {
    for (const kind of ADMIN_MAIL_KINDS) {
      test(`${kind} in ${locale} has a subject and the privacy line`, () => {
        const mail = adminMail(kind, locale, extra);
        expect(mail.subject.trim().length).toBeGreaterThan(0);
        expect(mail.text).toContain(PRIVACY[locale]);
        expect(mail.html).toContain("privacy@wambito.com");
        expect(mail.html).toContain(`lang="${locale}"`);
      });
    }

    test(`every kind has its own subject in ${locale}`, () => {
      const subjects = ADMIN_MAIL_KINDS.map((k) => adminMail(k, locale, extra).subject);
      expect(new Set(subjects).size).toBe(ADMIN_MAIL_KINDS.length);
    });
  }

  test("an unknown locale falls back to Spanish", () => {
    expect(adminMail("account_deleted", "fr", extra)).toEqual(
      adminMail("account_deleted", "es", extra),
    );
  });

  test("the confirmation link is in the text and in the button", () => {
    const mail = adminMail("email_change_link", "en", extra);
    expect(mail.text).toContain(extra.link);
    expect(mail.html).toContain(`href="${extra.link}"`);
  });

  test("a notice without a link has no button", () => {
    expect(adminMail("sessions_revoked", "en", extra).html).not.toContain(
      '<a href="http://localhost:5173/confirm',
    );
  });

  test("the assistant's and the passkey's names are shown, escaped", () => {
    const mail = adminMail("assistant_revoked", "es", { ...extra, assistant: "<Bot & Co>" });
    expect(mail.text).toContain("<Bot & Co>");
    expect(mail.html).toContain("&lt;Bot &amp; Co&gt;");
    expect(mail.html).not.toContain("<Bot");
    expect(adminMail("passkey_removed", "en", extra).text).toContain("Laptop");
  });

  test("without names, the copy still reads", () => {
    const assistant = adminMail("assistant_revoked", "en", { webUrl: WEB });
    const passkey = adminMail("passkey_removed", "en", { webUrl: WEB });
    expect(assistant.text).not.toContain("undefined");
    expect(passkey.text).not.toContain("undefined");
  });
});
