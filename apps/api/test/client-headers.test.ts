import { describe, expect, test } from "vitest";
import { clientHeader } from "../src/http/client-headers.ts";

describe("clientHeader", () => {
  test("new wins over old", () => {
    const headers = new Headers({
      "x-wambito-timezone": "America/Bogota",
      "x-lukas-timezone": "Europe/Lisbon",
    });
    expect(clientHeader(headers, "timezone")).toBe("America/Bogota");
  });

  test("old alone still works", () => {
    const headers = new Headers({ "x-lukas-timezone": "Europe/Lisbon" });
    expect(clientHeader(headers, "timezone")).toBe("Europe/Lisbon");
  });

  test("mixed request reads only the new prefix", () => {
    const headers = new Headers({
      "x-wambito-locale": "es",
      "x-lukas-timezone": "Europe/Lisbon",
      "x-lukas-locale": "en",
    });
    expect(clientHeader(headers, "locale")).toBe("es");
    expect(clientHeader(headers, "timezone")).toBeUndefined();
  });

  test("neither", () => {
    expect(clientHeader(new Headers(), "timezone")).toBeUndefined();
    expect(clientHeader(new Headers({ "x-other-timezone": "UTC" }), "timezone")).toBeUndefined();
  });

  test.each(["locale", "next", "timezone", "client", "background"] as const)(
    "%s reads x-wambito-%s, else x-lukas-%s",
    (name) => {
      expect(clientHeader(new Headers({ [`x-wambito-${name}`]: "new" }), name)).toBe("new");
      expect(clientHeader(new Headers({ [`x-lukas-${name}`]: "old" }), name)).toBe("old");
    },
  );
});
