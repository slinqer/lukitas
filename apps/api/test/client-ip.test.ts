import { describe, expect, test } from "vitest";
import { clientIp, ipAllowed } from "../src/http/client-ip.ts";

const h = (value: string, name = "x-forwarded-for") => new Headers({ [name]: value });
const cfg = (TRUSTED_PROXIES: string[] = [], CLIENT_IP_HEADER = "x-forwarded-for") => ({
  CLIENT_IP_HEADER,
  TRUSTED_PROXIES,
});

describe("clientIp", () => {
  test("strips trusted proxies from the right", () => {
    expect(clientIp(h("198.51.0.1, 10.0.0.1"), cfg(["10.0.0.0/8"]))).toBe("198.51.0.1");
  });

  test("ignores a spoofed left entry", () => {
    expect(clientIp(h("1.1.1.1, 198.51.0.1, 10.0.0.1"), cfg(["10.0.0.0/8"]))).toBe("198.51.0.1");
  });

  test("without trusted proxies only a single value is trusted", () => {
    expect(clientIp(h("198.51.0.1"), cfg())).toBe("198.51.0.1");
    expect(clientIp(h("1.1.1.1, 198.51.0.1"), cfg())).toBeNull();
  });

  test("reads the configured header; missing or invalid gives null", () => {
    expect(clientIp(h("203.0.113.9", "fly-client-ip"), cfg([], "fly-client-ip"))).toBe(
      "203.0.113.9",
    );
    expect(clientIp(new Headers(), cfg())).toBeNull();
    expect(clientIp(h("garbage"), cfg())).toBeNull();
    expect(clientIp(h("10.0.0.1"), cfg(["10.0.0.0/8"]))).toBeNull();
  });

  test("maps IPv4-in-IPv6 to IPv4", () => {
    expect(clientIp(h("::ffff:192.0.2.1"), cfg())).toBe("192.0.2.1");
  });
});

describe("ipAllowed", () => {
  test("matches IPv4 CIDRs and single IPs", () => {
    expect(ipAllowed("10.1.2.3", ["10.0.0.0/8"])).toBe(true);
    expect(ipAllowed("11.1.2.3", ["10.0.0.0/8"])).toBe(false);
    expect(ipAllowed("1.2.3.4", ["1.2.3.4"])).toBe(true);
    expect(ipAllowed("1.2.3.5", ["1.2.3.4"])).toBe(false);
  });

  test("matches IPv6", () => {
    expect(ipAllowed("::1", ["::1"])).toBe(true);
    expect(ipAllowed("2001:db8::5", ["2001:db8::/32"])).toBe(true);
    expect(ipAllowed("2001:db9::5", ["2001:db8::/32"])).toBe(false);
  });

  test("null, empty list or junk is refused", () => {
    expect(ipAllowed(null, ["10.0.0.0/8"])).toBe(false);
    expect(ipAllowed("10.0.0.1", [])).toBe(false);
    expect(ipAllowed("nope", ["10.0.0.0/8"])).toBe(false);
  });
});
