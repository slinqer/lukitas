import {
  APP_ROLE,
  databaseUrl,
  ensureAppRole,
  grantAppRole,
  prepareDatabase,
} from "../bootstrap.ts";

// With --role-only: just the role and its password (a restore creates the tables from a dump).
const roleOnly = process.argv.includes("--role-only");
// With --grant-only DB: just the app role's grants, on database DB of the same server (the
// scratch database of a restore drill, restored without the dump's grants).
const grantOnlyAt = process.argv.indexOf("--grant-only");
const grantOnly = grantOnlyAt === -1 ? undefined : process.argv[grantOnlyAt + 1];
if (grantOnlyAt !== -1 && (!grantOnly || grantOnly.startsWith("--")))
  throw new Error("--grant-only needs a database name");
// With --also-role NAME (with --grant-only or the full bootstrap): NAME gets the same grants. The
// role the API still connects as (2b: remove once the API connects as wambito_app).
const alsoRoleAt = process.argv.indexOf("--also-role");
const alsoRole = alsoRoleAt === -1 ? undefined : process.argv[alsoRoleAt + 1];
if (alsoRoleAt !== -1 && (!alsoRole || alsoRole.startsWith("--")))
  throw new Error("--also-role needs a role name");
const alsoRoles = alsoRole ? [alsoRole] : [];

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("DATABASE_ADMIN_URL is required");

if (grantOnly) {
  await grantAppRole(databaseUrl(adminUrl, grantOnly), alsoRoles);
  console.log(`Roles ${[APP_ROLE, ...alsoRoles].join(", ")} granted on ${grantOnly}`);
} else {
  const appPassword = process.env.APP_DB_PASSWORD;
  if (!appPassword) throw new Error("APP_DB_PASSWORD is required");
  if (roleOnly) {
    await ensureAppRole(adminUrl, appPassword);
    console.log(`Role ${APP_ROLE} ready`);
  } else {
    await prepareDatabase(adminUrl, appPassword, alsoRoles);
    console.log(`Database ready: ${APP_ROLE} role set, migrations applied`);
  }
}
