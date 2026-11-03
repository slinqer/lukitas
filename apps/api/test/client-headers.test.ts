import { describe, expect, test } from "vitest";
import { clientHeader } from "../src/http/client-headers.ts";

describe("clientHeader", () => {
  test("an old x-lukas-* header is ignored", () => {
    expect(clientHeader(new Headers({ "x-lukas-locale": "es" }), "locale")).toBeUndefined();
    const both = new Headers({ "x-wambito-timezone": "America/Bogota", "x-lukas-locale": "en" });
    expect(clientHeader(both, "locale")).toBeUndefined();
    expect(clientHeader(both, "timezone")).toBe("America/Bogota");
  });

  test("neither", () => {
    expect(clientHeader(undefined, "timezone")).toBeUndefined();
    expect(clientHeader(new Headers(), "timezone")).toBeUndefined();
    expect(clientHeader(new Headers({ "x-other-timezone": "UTC" }), "timezone")).toBeUndefined();
  });

  test.each(["locale", "next", "timezone", "client", "background"] as const)(
    "%s reads x-wambito-%s",
    (name) => {
      expect(clientHeader(new Headers({ [`x-wambito-${name}`]: "new" }), name)).toBe("new");
    },
  );
});
