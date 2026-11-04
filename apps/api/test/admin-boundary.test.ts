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

/** The same tables by their SQL names (packages/db/src/schema/domain.ts). */
const FINANCE_SQL = [
  "accounts",
  "categories",
  "category_budgets",
  "recurrences",
  "imports",
  "transactions",
  "idempotency_keys",
];

/** Every file the admin panel's API is made of. */
function adminFiles(): string[] {
  const dir = join(SRC, "services", "admin");
  return [
    ...readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => join(dir, f)),
    join(SRC, "routes", "admin.ts"),
    join(SRC, "routes", "email-change.ts"),
    join(SRC, "http", "admin.ts"),
    join(SRC, "emails", "admin.ts"),
  ];
}

/** Whether the source imports the whole db package as a namespace (which hides what it uses). */
function importsDbNamespace(source: string): boolean {
  return /import\s+(?:type\s+)?\*\s+as\s+\w+\s+from\s+["']@wambito\/db(?:\/[^"']*)?["']/.test(
    source,
  );
}

/** The finance tables' SQL names in the source outside comments (raw SQL would name them so). */
function financeSqlNames(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return FINANCE_SQL.filter((name) => new RegExp(`\\b${name}\\b`).test(code));
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

test("no admin file imports the db package as a namespace", () => {
  for (const file of adminFiles()) {
    expect({ file, namespace: importsDbNamespace(readFileSync(file, "utf8")) }).toEqual({
      file,
      namespace: false,
    });
  }
});

test("no admin file names a finance table in SQL", () => {
  for (const file of adminFiles()) {
    expect({ file, bad: financeSqlNames(readFileSync(file, "utf8")) }).toEqual({ file, bad: [] });
  }
});

test("the boundary check sees a namespace import and a finance table in raw SQL", () => {
  expect(importsDbNamespace(`import * as schema from "@wambito/db";`)).toBe(true);
  expect(importsDbNamespace(`import * as orm from "@wambito/db/orm";`)).toBe(true);
  expect(importsDbNamespace(`import { user } from "@wambito/db";`)).toBe(false);
  expect(financeSqlNames("db.execute(sql`delete from category_budgets where x`)")).toEqual([
    "category_budgets",
  ]);
  expect(financeSqlNames('sql.raw("select * from transactions")')).toEqual(["transactions"]);
  expect(financeSqlNames("// no transactions here\n/* nor accounts */ const x = 1;")).toEqual([]);
});

test("the boundary check sees a finance import", () => {
  expect(importedNames(`import {\n  transactions,\n  type Db } from "@wambito/db";`)).toEqual([
    "transactions",
    "Db",
  ]);
});
