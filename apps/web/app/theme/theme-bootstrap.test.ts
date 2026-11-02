import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_BOOTSTRAP_SCRIPT } from "./theme-bootstrap.ts";

interface Env {
  stored?: string | null;
  /** What is kept under the old key (`lukas.theme`), from before the rename. */
  oldStored?: string;
  prefersDark?: boolean;
  storageThrows?: boolean;
  noMatchMedia?: boolean;
}

/** Runs the inline script against a fake document, localStorage and matchMedia. */
function run(env: Env): { theme: string | undefined; data: Map<string, string> } {
  const dataset: Record<string, string> = {};
  const document = { documentElement: { dataset } };
  const data = new Map<string, string>();
  if (env.stored != null) data.set("wambito.theme", env.stored);
  if (env.oldStored != null) data.set("lukas.theme", env.oldStored);
  const localStorage = {
    getItem(key: string) {
      if (env.storageThrows) throw new Error("storage blocked");
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (env.storageThrows) throw new Error("storage blocked");
      data.set(key, value);
    },
    removeItem(key: string) {
      if (env.storageThrows) throw new Error("storage blocked");
      data.delete(key);
    },
  };
  const matchMedia = (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? (env.prefersDark ?? false) : false,
  });
  const args: unknown[] = [document, localStorage, env.noMatchMedia ? undefined : matchMedia];
  new Function("document", "localStorage", "matchMedia", THEME_BOOTSTRAP_SCRIPT)(...args);
  return { theme: dataset.theme, data };
}

describe("THEME_BOOTSTRAP_SCRIPT (theme flash)", () => {
  it("applies the stored day theme even when the OS prefers dark", () => {
    expect(run({ stored: "day", prefersDark: true }).theme).toBe("day");
  });

  it("applies the stored night theme even when the OS prefers light", () => {
    expect(run({ stored: "night", prefersDark: false }).theme).toBe("night");
  });

  it("defaults to night when nothing is stored, whatever the OS prefers", () => {
    expect(run({ stored: null, prefersDark: false }).theme).toBe("night");
    expect(run({ stored: null, prefersDark: true }).theme).toBe("night");
  });

  it("follows the OS only for a stored auto", () => {
    expect(run({ stored: "auto", prefersDark: true }).theme).toBe("night");
    expect(run({ stored: "auto", prefersDark: false }).theme).toBe("day");
  });

  it("falls back to night for a stored auto without matchMedia", () => {
    expect(run({ stored: "auto", noMatchMedia: true }).theme).toBe("night");
  });

  it("falls back to night for an unknown stored value, even on a light OS", () => {
    expect(run({ stored: "purple", prefersDark: false }).theme).toBe("night");
    expect(run({ stored: "purple", prefersDark: true }).theme).toBe("night");
  });

  it("falls back to night when localStorage throws, even on a light OS", () => {
    expect(run({ storageThrows: true, prefersDark: false }).theme).toBe("night");
    expect(run({ storageThrows: true, prefersDark: true }).theme).toBe("night");
  });

  // 2b: remove, with the lukas.* migration.
  it("applies a theme kept under the old lukas.theme, and moves it to wambito.theme", () => {
    const { theme, data } = run({ oldStored: "day", prefersDark: true });
    expect(theme).toBe("day");
    expect(data.get("wambito.theme")).toBe("day");
    expect(data.has("lukas.theme")).toBe(false);
  });

  it("prefers wambito.theme over the old key, and drops the old one", () => {
    const { theme, data } = run({ stored: "night", oldStored: "day", prefersDark: false });
    expect(theme).toBe("night");
    expect(data.has("lukas.theme")).toBe(false);
  });

  it("defaults to night without matchMedia", () => {
    expect(run({ stored: null, noMatchMedia: true }).theme).toBe("night");
  });
});

describe("resolveTheme", () => {
  it("returns explicit choices and resolves auto from the OS", () => {
    expect(resolveTheme("day", true)).toBe("day");
    expect(resolveTheme("night", false)).toBe("night");
    expect(resolveTheme("auto", true)).toBe("night");
    expect(resolveTheme("auto", false)).toBe("day");
  });
});
