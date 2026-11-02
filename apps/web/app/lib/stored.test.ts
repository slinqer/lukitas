import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, removeStored, writeStored } from "./stored.ts";

/** A `Storage` stand-in: the unit tests run in Node, which has none. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const blocked = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
  removeItem: () => {
    throw new Error("denied");
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readStored", () => {
  it("reads wambito.<name>", () => {
    const storage = memoryStorage({ "wambito.theme": "night" });
    expect(readStored("theme", storage)).toBe("night");
  });

  it("migrates once: the old lukas.<name> moves to wambito.<name>", () => {
    const storage = memoryStorage({ "lukas.theme": "day" });
    expect(readStored("theme", storage)).toBe("day");
    expect(storage.data.get("wambito.theme")).toBe("day");
    expect(storage.data.has("lukas.theme")).toBe(false);
    expect(readStored("theme", storage)).toBe("day");
  });

  it("new wins: with both set it returns the new value and removes the old one", () => {
    const storage = memoryStorage({ "wambito.theme": "night", "lukas.theme": "day" });
    expect(readStored("theme", storage)).toBe("night");
    expect(storage.data.get("wambito.theme")).toBe("night");
    expect(storage.data.has("lukas.theme")).toBe(false);
  });

  it("returns null when nothing is stored", () => {
    expect(readStored("theme", memoryStorage())).toBeNull();
  });

  it("returns null when storage throws, or is missing", () => {
    expect(readStored("theme", blocked)).toBeNull();
    expect(readStored("theme", null)).toBeNull();
  });

  it("uses localStorage by default, and a missing one is null", () => {
    const storage = memoryStorage({ "lukas.sound": "off" });
    vi.stubGlobal("localStorage", storage);
    expect(readStored("sound")).toBe("off");
    expect(storage.data.get("wambito.sound")).toBe("off");
    vi.stubGlobal("localStorage", undefined);
    expect(readStored("sound")).toBeNull();
  });
});

describe("writeStored and removeStored", () => {
  it("write and remove wambito.<name>", () => {
    const storage = memoryStorage({ "lukas.sound": "off" });
    writeStored("sound", "off", storage);
    expect(storage.data.get("wambito.sound")).toBe("off");
    removeStored("sound", storage);
    expect(storage.data.has("wambito.sound")).toBe(false);
    // Removing also drops the old key, so a later read cannot bring it back.
    expect(readStored("sound", storage)).toBeNull();
  });

  it("never throw", () => {
    expect(() => writeStored("sound", "off", blocked)).not.toThrow();
    expect(() => removeStored("sound", blocked)).not.toThrow();
    expect(() => writeStored("sound", "off", null)).not.toThrow();
  });
});
