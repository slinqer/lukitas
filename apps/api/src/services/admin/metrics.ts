import { type Db, session, user } from "@wambito/db";
import { sql } from "@wambito/db/orm";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;

export interface AdminMetrics {
  total: number;
  withEmail: number;
  guests: number;
  /** Accounts whose latest activity (as in the look-up) is within 30 days. */
  active30d: number;
  suspended: number;
  signups7d: number;
  signupsPrev7d: number;
  /** The last 12 ISO weeks (Monday, UTC), oldest first. */
  weekly: { weekStart: string; withEmail: number; guests: number }[];
}

/** Monday 00:00 UTC of the ISO week that contains `d`. */
function isoWeekStart(d: Date): Date {
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * DAY_MS);
}

/**
 * The home screen's numbers (spec §6): SQL aggregates over `user` and `session` only, so no
 * account row leaves the database. `user` timestamps are UTC without a zone, hence the
 * `::timestamp` casts of ISO strings.
 */
export async function adminMetrics(db: Db, now: Date): Promise<AdminMetrics> {
  const ts = (d: Date) => sql`${d.toISOString()}::timestamp`;
  const ago = (days: number) => ts(new Date(now.getTime() - days * DAY_MS));
  const latest = sql`greatest(
    ${user.lastActiveAt},
    (select max(${session.updatedAt}) from ${session} where ${session.userId} = ${user.id})
  )`;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      guests: sql<number>`(count(*) filter (where ${user.isAnonymous}))::int`,
      active30d: sql<number>`(count(*) filter (where ${latest} >= ${ago(30)}))::int`,
      suspended: sql<number>`(count(*) filter (where ${user.suspendedAt} is not null))::int`,
      signups7d: sql<number>`(count(*) filter (where ${user.createdAt} > ${ago(7)} and ${user.createdAt} <= ${ts(now)}))::int`,
      signupsPrev7d: sql<number>`(count(*) filter (where ${user.createdAt} > ${ago(14)} and ${user.createdAt} <= ${ago(7)}))::int`,
    })
    .from(user);

  const lastWeek = isoWeekStart(now);
  const firstWeek = new Date(lastWeek.getTime() - (WEEKS - 1) * 7 * DAY_MS);
  const rows = await db.execute<{ week_start: string; with_email: number; guests: number }>(sql`
    select to_char(w, 'YYYY-MM-DD') as week_start,
           (count(u.id) filter (where not u.is_anonymous))::int as with_email,
           (count(u.id) filter (where u.is_anonymous))::int as guests
    from generate_series(${ts(firstWeek)}, ${ts(lastWeek)}, interval '1 week') as w
    left join ${user} u
      on u.created_at >= w and u.created_at < w + interval '1 week'
    group by w
    order by w`);

  const total = totals?.total ?? 0;
  const guests = totals?.guests ?? 0;
  return {
    total,
    withEmail: total - guests,
    guests,
    active30d: totals?.active30d ?? 0,
    suspended: totals?.suspended ?? 0,
    signups7d: totals?.signups7d ?? 0,
    signupsPrev7d: totals?.signupsPrev7d ?? 0,
    weekly: [...rows].map((r) => ({
      weekStart: r.week_start,
      withEmail: r.with_email,
      guests: r.guests,
    })),
  };
}
