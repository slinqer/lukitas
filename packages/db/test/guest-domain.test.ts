import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { MIGRATIONS_FOLDER, runMigrations } from "../src/migrate.ts";
import { startBareDatabase } from "../src/testing.ts";

vi.setConfig({ testTimeout: 60_000 });

let adminUrl: string;
let stop: () => Promise<void>;
let tmp: string;

beforeAll(async () => {
  ({ adminUrl, stop } = await startBareDatabase());
  tmp = await mkdtemp(join(tmpdir(), "wambito-migrations-"));
}, 120_000);
afterAll(async () => {
  await stop?.();
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

/** Copies the migrations folder keeping only the entries up to and including `lastTag`. */
async function migrationsUpTo(lastTag: string): Promise<string> {
  const dest = join(tmp, "up-to");
  await cp(MIGRATIONS_FOLDER, dest, { recursive: true });
  const path = join(dest, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(path, "utf8"));
  const last = journal.entries.findIndex((e: { tag: string }) => e.tag.startsWith(lastTag));
  journal.entries = journal.entries.slice(0, last + 1);
  await writeFile(path, JSON.stringify(journal));
  return dest;
}

test("guests' placeholder emails move to guest.wambito.invalid; only a true suffix moves", async () => {
  const client = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: await migrationsUpTo("0006") });
    const emails = [
      "temp-a@guest.lukitas.invalid",
      "Temp-B@guest.lukitas.invalid",
      "member@wambito.test",
      "x@guest.lukitas.invalid.example",
    ];
    for (const [i, email] of emails.entries()) {
      await client`
        insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${`u${i}`}, 'n', ${email}, false, now(), now())`;
    }

    await runMigrations(adminUrl);

    const rows = await client`select id, email from "user" order by id`;
    expect(rows.map((r) => r.email)).toEqual([
      "temp-a@guest.wambito.invalid",
      "Temp-B@guest.wambito.invalid",
      "member@wambito.test",
      "x@guest.lukitas.invalid.example",
    ]);
  } finally {
    await client.end();
  }
});
