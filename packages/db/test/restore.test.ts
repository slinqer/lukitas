import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { APP_ROLE, databaseUrl, ensureAppRole, prepareDatabase } from "../src/bootstrap.ts";
import { runMigrations } from "../src/migrate.ts";
import { RESTORE_FLAGS, startBareDatabase } from "../src/testing.ts";

// Two servers, a dump and a restore: a loaded machine needs more than 5 s.
vi.setConfig({ testTimeout: 120_000 });

const PASSWORD = "restored-app-password-0123456789";
const DUMP = `/tmp/wambito-restore-test-${process.pid}.dump`;

// The four grant statements the old migration 0001 ran, as they were applied on the VPS.
const OLD_0001_GRANTS = [
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lukas_app",
  "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lukas_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lukas_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lukas_app",
];

let old: Awaited<ReturnType<typeof startBareDatabase>>;
let fresh: Awaited<ReturnType<typeof startBareDatabase>>;

beforeAll(async () => {
  [old, fresh] = await Promise.all([startBareDatabase(), startBareDatabase()]);
}, 180_000);
afterAll(async () => {
  await Promise.all([old?.stop(), fresh?.stop()]);
});

describe("restore", () => {
  test("a dump made under lukas_app restores into a server whose role is wambito_app", async () => {
    // Server A, as production was before the rename: role lukas_app, the old 0001 grants, data.
    const a = postgres(old.adminUrl, { max: 1, onnotice: () => {} });
    try {
      await a.unsafe(
        "CREATE ROLE lukas_app LOGIN PASSWORD 'old-app-password-0123456789' NOSUPERUSER NOBYPASSRLS",
      );
      await a.unsafe("GRANT USAGE ON SCHEMA public TO lukas_app");
      await runMigrations(old.adminUrl);
      for (const statement of OLD_0001_GRANTS) await a.unsafe(statement);
      await a`insert into "user" (id, name, email) values ('owner', 'O', 'o@wambito.test')`;
      const [account] = await a<{ id: string }[]>`
        insert into accounts (id, user_id, name, currency)
        values (gen_random_uuid(), 'owner', 'Efectivo', 'COP') returning id`;
      const [category] = await a<{ id: string }[]>`
        insert into categories (id, user_id, name, kind, icon, color)
        values (gen_random_uuid(), 'owner', 'Comida', 'expense', 'star', 'purple') returning id`;
      await a`
        insert into transactions (id, user_id, account_id, category_id, name, amount, currency, date, source)
        values (gen_random_uuid(), 'owner', ${account?.id ?? ""}, ${category?.id ?? ""}, 'Almuerzo',
          -1800000, 'COP', '2026-10-21', 'web')`;
    } finally {
      await a.end();
    }
    await old.exec(["pg_dump", "-Fc", "-f", DUMP, old.toolsUrl]);
    await fresh.writeFile(DUMP, await old.readFile(DUMP));

    // Server B, a new one: no lukas_app. The role first (restore.sh's --role-only), then the dump
    // into an empty database, then the full bootstrap on it.
    await ensureAppRole(fresh.adminUrl, PASSWORD);
    const b = postgres(fresh.adminUrl, { max: 1, onnotice: () => {} });
    await b.unsafe("create database restored");
    await b.end();
    await fresh.exec([
      "pg_restore",
      ...RESTORE_FLAGS,
      "-d",
      databaseUrl(fresh.toolsUrl, "restored"),
      DUMP,
    ]);
    const restoredUrl = databaseUrl(fresh.adminUrl, "restored");
    await prepareDatabase(restoredUrl, PASSWORD);

    const appUrl = new URL(restoredUrl);
    appUrl.username = APP_ROLE;
    appUrl.password = PASSWORD;
    const app = postgres(appUrl.toString(), { max: 1, onnotice: () => {} });
    try {
      const count = (userId: string) =>
        app.begin(async (tx) => {
          await tx`select set_config('app.user_id', ${userId}, true)`;
          const [row] = await tx<{ n: number }[]>`select count(*)::int as n from transactions`;
          return row?.n;
        });
      expect(await count("owner")).toBe(1);
      expect(await count("someone-else")).toBe(0);
    } finally {
      await app.end();
    }
  });
});
