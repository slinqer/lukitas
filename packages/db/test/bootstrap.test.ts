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
import { startBareDatabase } from "../src/testing.ts";

// Each test migrates a database or starts a container; a loaded machine needs more than 5 s.
vi.setConfig({ testTimeout: 60_000 });

const PASSWORD = "first-app-password-0123456789";
const NEXT_PASSWORD = "second-app-password-9876543210";

let adminUrl: string;
let stop: () => Promise<void>;

const asApp = (password: string) => {
  const url = new URL(adminUrl);
  url.username = APP_ROLE;
  url.password = password;
  return postgres(url.toString(), { max: 1, onnotice: () => {} });
};

beforeAll(async () => {
  ({ adminUrl, stop } = await startBareDatabase());
}, 120_000);
afterAll(async () => {
  await stop?.();
});

describe("prepareDatabase", () => {
  test("on an empty server: creates the app role with its password, then migrates", async () => {
    await prepareDatabase(adminUrl, PASSWORD);

    const app = asApp(PASSWORD);
    try {
      const [role] = await app`
        select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole from pg_roles where rolname = current_user`;
      expect(role).toEqual({
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
      });
      // The migrations ran and granted the role its table privileges; row-level security hides
      // rows when no user is set, and the role cannot create tables.
      expect(await app`select * from "user"`).toHaveLength(0);
      await expect(app`create table intruder (id int)`).rejects.toThrow(/permission denied/);
    } finally {
      await app.end();
    }
  });

  test("is idempotent, and a new password replaces the old one", async () => {
    await prepareDatabase(adminUrl, PASSWORD);
    await prepareDatabase(adminUrl, NEXT_PASSWORD);

    const stale = asApp(PASSWORD);
    await expect(stale`select 1`).rejects.toThrow(/password authentication failed/);
    await stale.end();

    const fresh = asApp(NEXT_PASSWORD);
    expect(await fresh`select 1 as one`).toEqual([{ one: 1 }]);
    await fresh.end();
  });

  test("on an empty server: the app role can read and write every table and use every sequence", async () => {
    await prepareDatabase(adminUrl, PASSWORD);
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
    try {
      const tables = await admin<{ name: string }[]>`
        select quote_ident(table_name) as name from information_schema.tables where table_schema = 'public'`;
      expect(tables.length).toBeGreaterThan(0);
      for (const { name } of tables) {
        const [row] = await admin<{ ok: boolean }[]>`
          select has_table_privilege('wambito_app', ${`public.${name}`}, 'SELECT,INSERT,UPDATE,DELETE') as ok`;
        expect(row?.ok, name).toBe(true);
      }
      const sequences = await admin<{ name: string }[]>`
        select quote_ident(sequence_name) as name from information_schema.sequences where sequence_schema = 'public'`;
      for (const { name } of sequences) {
        const [row] = await admin<{ ok: boolean }[]>`
          select has_sequence_privilege('wambito_app', ${`public.${name}`}, 'USAGE,SELECT') as ok`;
        expect(row?.ok, name).toBe(true);
      }
    } finally {
      await admin.end();
    }
  });

  test("a table created after the bootstrap is granted by default", async () => {
    await prepareDatabase(adminUrl, PASSWORD);
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
    try {
      await admin`create table later_t (id int)`;
      const [row] = await admin<{ ok: boolean }[]>`
        select has_table_privilege('wambito_app', 'later_t', 'SELECT') as ok`;
      expect(row?.ok).toBe(true);
    } finally {
      await admin.end();
    }
  });

  test("keeps the data it finds", async () => {
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
    await admin`insert into "user" (id, name, email) values ('keep-me', 'K', 'k@wambito.test')`;
    await prepareDatabase(adminUrl, NEXT_PASSWORD);
    expect(await admin`select id from "user" where id = 'keep-me'`).toHaveLength(1);
    await admin.end();
  });

  test.each([
    ["too short", "short"],
    ["the development password", "wambito_app"],
    ["blank", ""],
  ])("refuses a password that is %s, before touching the database", async (_why, password) => {
    await expect(prepareDatabase("postgres://nobody@127.0.0.1:1/none", password)).rejects.toThrow(
      /APP_DB_PASSWORD/,
    );
  });

  test("a password with quotes and backslashes is stored as typed, not interpreted", async () => {
    const odd = `it's a "tricky" pass\\word 0123456789`;
    await prepareDatabase(adminUrl, odd);
    const app = asApp(odd);
    expect(await app`select 1 as one`).toEqual([{ one: 1 }]);
    await app.end();
  });
});

describe("databaseUrl", () => {
  test("points the URL at another database, keeping the server, user and password", () => {
    expect(
      databaseUrl("postgres://owner:p%40ss@postgres:5432/live", "live_restore_20261103_101500"),
    ).toBe("postgres://owner:p%40ss@postgres:5432/live_restore_20261103_101500");
    expect(databaseUrl("postgres://u@127.0.0.1:5433/postgres?sslmode=disable", "restored")).toBe(
      "postgres://u@127.0.0.1:5433/restored?sslmode=disable",
    );
  });
});

describe("ensureAppRole", () => {
  test("creates the role and nothing else: no tables, so a dump can be restored over it", async () => {
    const empty = await startBareDatabase();
    try {
      await ensureAppRole(empty.adminUrl, PASSWORD);
      const admin = postgres(empty.adminUrl, { max: 1, onnotice: () => {} });
      const [role] =
        await admin`select rolsuper, rolbypassrls from pg_roles where rolname = 'wambito_app'`;
      expect(role).toEqual({ rolsuper: false, rolbypassrls: false });
      expect(await admin`select tablename from pg_tables where schemaname = 'public'`).toHaveLength(
        0,
      );
      await admin.end();
    } finally {
      await empty.stop();
    }
  });
});

describe("grantAppRole", () => {
  test("on a restored dump from before admin_audit existed: grants, twice, without failing", async () => {
    const restored = await startBareDatabase();
    const admin = postgres(restored.adminUrl, { max: 1, onnotice: () => {} });
    try {
      await ensureAppRole(restored.adminUrl, PASSWORD);
      // What a restore drill (`--grant-only`) meets on a dump older than migration 0008.
      await admin`create table old_table (id int)`;
      await expect(grantAppRole(restored.adminUrl)).resolves.toBeUndefined();
      await expect(grantAppRole(restored.adminUrl)).resolves.toBeUndefined();
      const [row] = await admin<{ ok: boolean }[]>`
        select has_table_privilege('wambito_app', 'old_table', 'SELECT,INSERT,UPDATE,DELETE') as ok`;
      expect(row?.ok).toBe(true);
    } finally {
      await admin.end();
      await restored.stop();
    }
  });

  test("after the migrations, still revokes UPDATE and DELETE on admin_audit", async () => {
    await prepareDatabase(adminUrl, PASSWORD);
    await grantAppRole(adminUrl);
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
    try {
      const [row] = await admin<{ insert: boolean; update: boolean; delete: boolean }[]>`
        select has_table_privilege('wambito_app', 'admin_audit', 'INSERT') as insert,
               has_table_privilege('wambito_app', 'admin_audit', 'UPDATE') as update,
               has_table_privilege('wambito_app', 'admin_audit', 'DELETE') as delete`;
      expect(row).toEqual({ insert: true, update: false, delete: false });
    } finally {
      await admin.end();
    }
  });
});

// The four grant statements the old migration 0001 ran, as they were applied on the VPS.
const OLD_0001_GRANTS = [
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lukas_app",
  "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lukas_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lukas_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lukas_app",
];

describe("a database from before the rename", () => {
  test("a database migrated with the old 0001 takes the new bootstrap", async () => {
    const old = await startBareDatabase();
    const admin = postgres(old.adminUrl, { max: 1, onnotice: () => {} });
    try {
      await admin.unsafe(
        "CREATE ROLE lukas_app LOGIN PASSWORD 'old-app-password-0123456789' NOSUPERUSER NOBYPASSRLS",
      );
      await admin.unsafe("GRANT USAGE ON SCHEMA public TO lukas_app");
      await runMigrations(old.adminUrl);
      for (const statement of OLD_0001_GRANTS) await admin.unsafe(statement);
      await admin`insert into "user" (id, name, email) values ('old-row', 'O', 'o@wambito.test')`;
      const [before] = await admin<{ n: number }[]>`
        select count(*)::int as n from drizzle.__drizzle_migrations`;

      await expect(prepareDatabase(old.adminUrl, PASSWORD)).resolves.toBeUndefined();

      const [after] = await admin<{ n: number }[]>`
        select count(*)::int as n from drizzle.__drizzle_migrations`;
      expect(after?.n).toBe(before?.n);
      const [oldRole] = await admin<{ ok: boolean }[]>`
        select has_table_privilege('lukas_app', '"user"', 'SELECT') as ok`;
      const [newRole] = await admin<{ ok: boolean }[]>`
        select has_table_privilege('wambito_app', '"user"', 'SELECT') as ok`;
      expect(oldRole?.ok).toBe(true);
      expect(newRole?.ok).toBe(true);
      expect(await admin`select id from "user" where id = 'old-row'`).toHaveLength(1);
    } finally {
      await admin.end();
      await old.stop();
    }
  });
});
