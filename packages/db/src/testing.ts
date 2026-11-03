import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import postgres from "postgres";
import { grantAppRole } from "./bootstrap.ts";
import { runMigrations } from "./migrate.ts";

const exec = promisify(execFile);
// Postgres refuses to start on macOS without a valid locale in the environment.
const run = (cmd: string, args: string[]) =>
  exec(cmd, args, { env: { ...process.env, LC_ALL: "C", LANG: "C" } });
const INIT_SQL = new URL("../../../docker/postgres/init.sql", import.meta.url);

interface TestDatabase {
  adminUrl: string;
  appUrl: string;
  stop(): Promise<void>;
}

/**
 * The pg_restore flags of a restore. `deploy/personal/restore.sh` and `deploy/personal/backup.sh`
 * use the same list (keep them in step): no owner and no grants from the dump, so a dump restores
 * whatever the app role was called when it was taken; the bootstrap grants afterwards.
 */
export const RESTORE_FLAGS = ["--no-owner", "--no-acl", "--exit-on-error", "--single-transaction"];

/** A server with nothing in it, plus a way to run the Postgres command-line tools next to it. */
interface BareDatabase extends Pick<TestDatabase, "adminUrl" | "stop"> {
  /** The admin URL as the tools run by `exec` reach the server. */
  toolsUrl: string;
  /** Runs a command where the server's tools are (inside the container); returns its stdout. */
  exec(cmd: string[]): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: Buffer): Promise<void>;
}

/** A throwaway Postgres with nothing in it: no `wambito_app` role, no tables. */
export async function startBareDatabase(): Promise<BareDatabase> {
  return process.env.WAMBITO_TEST_DB === "local" ? startLocalCluster() : startContainer();
}

/**
 * Starts a throwaway Postgres with the `wambito_app` role and all migrations applied and granted.
 * Uses a Docker container by default; set WAMBITO_TEST_DB=local to use the `initdb`/`pg_ctl`
 * binaries on PATH instead (handy when Docker is not running).
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const { adminUrl, stop } =
    process.env.WAMBITO_TEST_DB === "local" ? await startLocalCluster() : await startContainer();
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(await readFile(INIT_SQL, "utf8"));
  await admin.end();
  await runMigrations(adminUrl);
  await grantAppRole(adminUrl);
  const app = new URL(adminUrl);
  app.username = "wambito_app";
  app.password = "wambito_app";
  return { adminUrl, appUrl: app.toString(), stop };
}

async function startContainer(): Promise<BareDatabase> {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();
  const exec = async (cmd: string[]) => {
    const { exitCode, stdout, stderr } = await container.exec(cmd);
    if (exitCode !== 0) throw new Error(`${cmd[0]} exited ${exitCode}: ${stderr}`);
    return stdout;
  };
  const tools = new URL(container.getConnectionUri());
  tools.hostname = "127.0.0.1";
  tools.port = "5432";
  return {
    adminUrl: container.getConnectionUri(),
    toolsUrl: tools.toString(),
    exec,
    // base64 keeps the bytes of a binary file intact through the exec output.
    readFile: async (path) => Buffer.from(await exec(["base64", path]), "base64"),
    writeFile: (path, content) => container.copyContentToContainer([{ content, target: path }]),
    stop: async () => {
      await container.stop();
    },
  };
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer().listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address ? resolve(address.port) : reject(),
      );
    });
  });
}

async function startLocalCluster(): Promise<BareDatabase> {
  const dir = await mkdtemp(join(tmpdir(), "wambito-pg-"));
  const data = join(dir, "data");
  const port = await freePort();
  await run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8"]);
  await run("pg_ctl", [
    "-D",
    data,
    "-l",
    join(dir, "log"),
    "-o",
    `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=`,
    "-w",
    "start",
  ]);
  const adminUrl = `postgres://postgres@127.0.0.1:${port}/postgres`;
  return {
    adminUrl,
    toolsUrl: adminUrl,
    exec: async ([cmd = "", ...args]) => (await run(cmd, args)).stdout,
    readFile: (path) => readFile(path),
    writeFile: (path, content) => writeFile(path, content),
    stop: async () => {
      await run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]);
      await rm(dir, { recursive: true, force: true });
    },
  };
}
