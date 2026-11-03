import { rm } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  APP_ROLE,
  databaseUrl,
  ensureAppRole,
  grantAppRole,
  prepareDatabase,
} from "../src/bootstrap.ts";
import { runMigrations } from "../src/migrate.ts";
import { RESTORE_FLAGS, startBareDatabase } from "../src/testing.ts";

// Two servers, a dump and a restore: a loaded machine needs more than 5 s.
vi.setConfig({ testTimeout: 120_000 });

const PASSWORD = "restored-app-password-0123456789";
const OLD_PASSWORD = "old-app-password-0123456789";
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

// Server A, as production was before the rename: role lukas_app, the old 0001 grants, one user
// with one transaction. Its dump is copied to server B, a new one without lukas_app.
beforeAll(async () => {
  [old, fresh] = await Promise.all([startBareDatabase(), startBareDatabase()]);
  const a = postgres(old.adminUrl, { max: 1, onnotice: () => {} });
  try {
    await a.unsafe(
      `CREATE ROLE lukas_app LOGIN PASSWORD '${OLD_PASSWORD}' NOSUPERUSER NOBYPASSRLS`,
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
}, 180_000);
afterAll(async () => {
  // In local mode the dump is a file on this machine; in a container it goes with the container.
  if (process.env.WAMBITO_TEST_DB === "local") await rm(DUMP, { force: true });
  await Promise.all([old?.stop(), fresh?.stop()]);
});

/** Creates database `name` on server B and restores the dump into it, as restore.sh does. */
async function restoreInto(name: string): Promise<string> {
  const b = postgres(fresh.adminUrl, { max: 1, onnotice: () => {} });
  await b.unsafe(`create database ${name}`);
  await b.end();
  await fresh.exec(["pg_restore", ...RESTORE_FLAGS, "-d", databaseUrl(fresh.toolsUrl, name), DUMP]);
  return databaseUrl(fresh.adminUrl, name);
}

/** The transactions `role` sees in the database at `url` with app.user_id set to each user. */
async function visibleAs(url: string, role: string, password: string) {
  const asRole = new URL(url);
  asRole.username = role;
  asRole.password = password;
  const sql = postgres(asRole.toString(), { max: 1, onnotice: () => {} });
  try {
    const count = (userId: string) =>
      sql.begin(async (tx) => {
        await tx`select set_config('app.user_id', ${userId}, true)`;
        const [row] = await tx<{ n: number }[]>`select count(*)::int as n from transactions`;
        return row?.n;
      });
    return { owner: await count("owner"), other: await count("someone-else") };
  } finally {
    await sql.end();
  }
}

describe("restore", () => {
  test("a dump made under lukas_app restores into a server whose role is wambito_app", async () => {
    // The role first (restore.sh's --role-only), then the dump, then the full bootstrap on it.
    await ensureAppRole(fresh.adminUrl, PASSWORD);
    const restoredUrl = await restoreInto("restored");
    await prepareDatabase(restoredUrl, PASSWORD);

    expect(await visibleAs(restoredUrl, APP_ROLE, PASSWORD)).toEqual({ owner: 1, other: 0 });
  });

  test("granted with the API's role too, the restored copy is readable by both roles", async () => {
    // While the API still connects as lukas_app (2b: remove once it connects as wambito_app).
    await ensureAppRole(fresh.adminUrl, PASSWORD);
    const b = postgres(fresh.adminUrl, { max: 1, onnotice: () => {} });
    await b.unsafe(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lukas_app') THEN
         CREATE ROLE lukas_app LOGIN PASSWORD '${OLD_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
       END IF; END $$`,
    );
    await b.end();

    // The drill's grant (--grant-only --also-role) and the live path's bootstrap (--also-role).
    const drillUrl = await restoreInto("drill_copy");
    await grantAppRole(drillUrl, ["lukas_app"]);
    const liveUrl = await restoreInto("live_copy");
    await prepareDatabase(liveUrl, PASSWORD, ["lukas_app"]);

    for (const url of [drillUrl, liveUrl]) {
      expect(await visibleAs(url, "lukas_app", OLD_PASSWORD)).toEqual({ owner: 1, other: 0 });
      expect(await visibleAs(url, APP_ROLE, PASSWORD)).toEqual({ owner: 1, other: 0 });
    }
  });
});
