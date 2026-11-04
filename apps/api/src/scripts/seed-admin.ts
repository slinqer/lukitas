// Development and CI seed: the admin account the admin panel's e2e signs in with. Upserts the user
// `dev-admin` (admin@wambito.test, email verified, onboarded) through DATABASE_ADMIN_URL, gives it
// what a sign-up would (the default account and the suggested categories, as the user.create hook
// in auth.ts does) so the app's screens work for it, and clears its sign-in email throttle so the
// e2e can sign it in again. The API lists it as an admin with ADMIN_USER_IDS=dev-admin (the root
// docker-compose.yml's default). Idempotent. Run: pnpm --filter @wambito/api seed:admin
import { SUGGESTED_CATEGORIES } from "@wambito/core";
import { accounts, categories, createDb, emailThrottle, user, withUser } from "@wambito/db";
import { and, eq, ne } from "@wambito/db/orm";

const ID = "dev-admin";
const EMAIL = "admin@wambito.test";
const LOCALE = "es";

const url = process.env.DATABASE_ADMIN_URL;
if (!url) throw new Error("DATABASE_ADMIN_URL is not set");
const { db, close } = createDb(url);

try {
  // The address is reserved for the seeded admin: an account that signed up with it before the
  // seed ran (another id) is removed, with everything it owns (the foreign keys cascade).
  await db.delete(user).where(and(eq(user.email, EMAIL), ne(user.id, ID)));
  await db
    .insert(user)
    .values({
      id: ID,
      name: "Admin",
      email: EMAIL,
      emailVerified: true,
      locale: LOCALE,
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({ target: user.id, set: { email: EMAIL, emailVerified: true } });

  await withUser(db, ID, async (tx) => {
    const [existing] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, ID), eq(accounts.isDefault, true)));
    if (existing) return;
    await tx
      .insert(accounts)
      .values({ userId: ID, name: "Main", currency: "EUR", isDefault: true });
    await tx.insert(categories).values(
      SUGGESTED_CATEGORIES.map((suggestion, sortOrder) => ({
        userId: ID,
        name: suggestion.names[LOCALE],
        kind: suggestion.kind,
        icon: suggestion.glyph,
        color: suggestion.tint,
        sortOrder,
      })),
    );
  });

  await db.delete(emailThrottle).where(eq(emailThrottle.email, EMAIL));
  console.log(`Seeded the admin ${EMAIL} (id ${ID}).`);
} finally {
  await close();
}
