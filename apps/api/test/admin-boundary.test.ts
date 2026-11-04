import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const FINANCE = [
  "accounts",
  "categories",
  "categoryBudgets",
  "recurrences",
  "imports",
  "transactions",
  "idempotencyKeys",
];

/** Every file the admin panel's API is made of. */
function adminFiles(): string[] {
  const dir = join(SRC, "services", "admin");
  return [
    ...readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => join(dir, f)),
    join(SRC, "routes", "admin.ts"),
  ];
}

/** The names an `import { … } from "…"` statement brings in (multi-line too). */
function importedNames(source: string): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from/g)) {
    for (const part of (m[1] ?? "").split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

test("no admin file imports a finance table (spec §3: only deleteAccount touches them)", () => {
  const files = adminFiles();
  expect(files.length).toBeGreaterThanOrEqual(3);
  for (const file of files) {
    const bad = importedNames(readFileSync(file, "utf8")).filter((n) => FINANCE.includes(n));
    expect({ file, bad }).toEqual({ file, bad: [] });
  }
});

test("the boundary check sees a finance import", () => {
  expect(importedNames(`import {\n  transactions,\n  type Db } from "@wambito/db";`)).toEqual([
    "transactions",
    "Db",
  ]);
});
