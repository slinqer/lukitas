import { categories, merchantCategories, transactions } from "@wambito/db";
import { and, eq } from "@wambito/db/orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createTestApp, type TestApp } from "./harness.ts";

let t: TestApp;
let a: { userId: string; headers: { authorization: string } };
let b: { userId: string; headers: { authorization: string } };

interface CaptureResult {
  result: "created" | "merged";
  transaction: {
    id: string;
    amount: number;
    currency: string;
    date: string;
    note: string | null;
    needsReview: boolean;
    source: string;
    captureSource: string | null;
    categoryId: string;
  };
  category: { name: string; fallback: boolean };
}

let keyCounter = 0;
const body = (extra: object = {}) => ({
  kind: "expense",
  amount: 1250,
  currency: "EUR",
  merchant: "Mercadona",
  capturedAt: "2026-11-04T15:00:00Z",
  source: "revolut",
  ...extra,
});
const capture = (
  extra: object = {},
  { user = a, key = `capture-key-${++keyCounter}` as string | null } = {},
) =>
  t.request("POST", "/v1/captures", {
    headers: { ...user.headers, ...(key ? { "idempotency-key": key } : {}) },
    body: body(extra),
  });
const json = async (res: Response) => (await res.json()) as CaptureResult;
const rows = async (user = a) =>
  (
    (await (
      await t.request("GET", "/v1/transactions?limit=200", { headers: user.headers })
    ).json()) as { items: { id: string }[] }
  ).items;
const at = (iso: string) => ({ capturedAt: iso });

beforeAll(async () => {
  t = await createTestApp();
  a = await t.signIn("a@wambito.test");
  b = await t.signIn("b@wambito.test");
});
afterAll(() => t?.stop());

describe("create", () => {
  test("creates a capture to review", async () => {
    const res = await capture({ merchant: "Create Shop" });
    expect(res.status).toBe(201);
    const out = await json(res);
    expect(out.result).toBe("created");
    expect(out.transaction).toMatchObject({
      amount: -1250,
      currency: "EUR",
      needsReview: true,
      source: "capture",
      captureSource: "revolut",
      note: null,
    });
    expect(out.category).toEqual({ name: "Otros gastos", fallback: true });
  });

  test("income lands in Otros ingresos", async () => {
    const out = await json(await capture({ kind: "income", amount: 500, merchant: "Income Co" }));
    expect(out.transaction.amount).toBe(500);
    expect(out.category).toEqual({ name: "Otros ingresos", fallback: true });
  });

  test("a merchant with no letters still saves, into the fallback", async () => {
    const res = await capture({ merchant: "***", amount: 777 });
    expect(res.status).toBe(201);
    expect((await json(res)).category).toEqual({ name: "Otros gastos", fallback: true });
  });

  test("a note keeps the original amount when the currency differs", async () => {
    const out = await json(await capture({ currency: "USD", amount: 5000, merchant: "Abroad" }));
    expect(out.transaction.note).toBe("50.00 USD");
    expect(out.transaction.needsReview).toBe(true);
    expect(out.transaction.amount).toBe(-5000);
    expect(out.transaction.currency).not.toBe("USD");
  });

  test("dates by the profile zone", async () => {
    const c = await t.signIn("zone@wambito.test");
    await t.request("PATCH", "/v1/me", {
      headers: c.headers,
      body: { timezone: "America/Bogota" },
    });
    const out = await json(await capture(at("2026-11-05T03:30:00Z"), { user: c }));
    expect(out.transaction.date).toBe("2026-11-04");
  });
});

describe("de-duplication", () => {
  test("merges within 10 minutes", async () => {
    const first = await json(await capture({ amount: 1111, ...at("2026-11-04T10:00:00Z") }));
    const before = (await rows()).length;
    const res = await capture({
      amount: 1111,
      source: "google_wallet",
      ...at("2026-11-04T10:09:00Z"),
    });
    expect(res.status).toBe(200);
    const out = await json(res);
    expect(out.result).toBe("merged");
    expect(out.transaction.id).toBe(first.transaction.id);
    expect(out.category.fallback).toBe(true);
    expect((await rows()).length).toBe(before);
  });

  test("does not merge after 10 minutes", async () => {
    const first = await json(await capture({ amount: 2222, ...at("2026-11-04T10:00:00Z") }));
    const second = await json(await capture({ amount: 2222, ...at("2026-11-04T10:11:00Z") }));
    expect(second.result).toBe("created");
    expect(second.transaction.id).not.toBe(first.transaction.id);
  });

  test("does not merge across kind", async () => {
    await capture({ amount: 3333, ...at("2026-11-04T10:00:00Z") });
    const out = await json(
      await capture({ amount: 3333, kind: "income", ...at("2026-11-04T10:01:00Z") }),
    );
    expect(out.result).toBe("created");
  });

  test("does not merge across amount or currency", async () => {
    await capture({ amount: 4444, ...at("2026-11-04T10:00:00Z") });
    expect(
      (await json(await capture({ amount: 4445, ...at("2026-11-04T10:01:00Z") }))).result,
    ).toBe("created");
    expect(
      (await json(await capture({ amount: 4444, currency: "USD", ...at("2026-11-04T10:01:00Z") })))
        .result,
    ).toBe("created");
  });

  test("merges into a confirmed capture", async () => {
    const first = await json(await capture({ amount: 5555, ...at("2026-11-04T10:00:00Z") }));
    await t.admin
      .update(transactions)
      .set({ needsReview: false })
      .where(eq(transactions.id, first.transaction.id));
    const out = await json(
      await capture({ amount: 5555, source: "google_wallet", ...at("2026-11-04T10:05:00Z") }),
    );
    expect(out.result).toBe("merged");
    expect(out.transaction.id).toBe(first.transaction.id);
  });

  test("never merges with a hand-typed transaction", async () => {
    const cat = await json(await capture({ amount: 6001, ...at("2026-11-03T10:00:00Z") }));
    const manual = await t.request("POST", "/v1/transactions", {
      headers: a.headers,
      body: {
        categoryId: cat.transaction.categoryId,
        name: "by hand",
        amount: -6666,
        date: "2026-11-04",
      },
    });
    expect(manual.status).toBe(201);
    const out = await json(await capture({ amount: 6666, ...at("2026-11-04T10:00:00Z") }));
    expect(out.result).toBe("created");
  });

  test("isolates users", async () => {
    await capture({ amount: 7777, ...at("2026-11-04T10:00:00Z") });
    const out = await json(
      await capture({ amount: 7777, ...at("2026-11-04T10:01:00Z") }, { user: b }),
    );
    expect(out.result).toBe("created");
  });
});

describe("category", () => {
  test("uses the merchant memory", async () => {
    const c = await t.signIn("memory@wambito.test");
    const [cat] = await t.admin
      .insert(categories)
      .values({ userId: c.userId, name: "Super", kind: "expense", icon: "🛒", color: "#fff" })
      .returning();
    await t.admin
      .insert(merchantCategories)
      .values({ userId: c.userId, merchantKey: "mercadona", categoryId: cat?.id as string });
    const out = await json(await capture({ merchant: "MERCADONA 1234" }, { user: c }));
    expect(out.transaction.categoryId).toBe(cat?.id);
    expect(out.category).toEqual({ name: "Super", fallback: false });
  });

  test("falls back when the remembered category was archived", async () => {
    const c = await t.signIn("memory2@wambito.test");
    const [cat] = await t.admin
      .insert(categories)
      .values({
        userId: c.userId,
        name: "Old",
        kind: "expense",
        icon: "🛒",
        color: "#fff",
        archivedAt: new Date(),
      })
      .returning();
    await t.admin
      .insert(merchantCategories)
      .values({ userId: c.userId, merchantKey: "mercadona", categoryId: cat?.id as string });
    const out = await json(await capture({}, { user: c }));
    expect(out.category).toEqual({ name: "Otros gastos", fallback: true });
  });

  test("adopts an existing Otros gastos instead of a second one", async () => {
    const c = await t.signIn("adopt@wambito.test");
    const made = await t.request("POST", "/v1/categories", {
      headers: c.headers,
      body: { name: "Otros gastos", kind: "expense", icon: "x", color: "red" },
    });
    const id = ((await made.json()) as { id: string }).id;
    const out = await json(await capture({}, { user: c }));
    expect(out.transaction.categoryId).toBe(id);
    expect(out.category.fallback).toBe(true);
    const [row] = await t.admin.select().from(categories).where(eq(categories.id, id));
    expect(row?.systemKey).toBe("other");
  });

  test("creates a new fallback after archiving it", async () => {
    const c = await t.signIn("archive@wambito.test");
    const first = await json(await capture({ amount: 11 }, { user: c }));
    await t.request("PATCH", `/v1/categories/${first.transaction.categoryId}`, {
      headers: c.headers,
      body: { archived: true },
    });
    const [archived] = await t.admin
      .select()
      .from(categories)
      .where(eq(categories.id, first.transaction.categoryId));
    expect(archived?.systemKey).toBeNull();
    const second = await json(await capture({ amount: 12 }, { user: c }));
    expect(second.transaction.categoryId).not.toBe(first.transaction.categoryId);
    expect(second.category).toEqual({ name: "Otros gastos", fallback: true });
  });

  test("names the fallback in the profile language", async () => {
    const c = await t.signIn("en@wambito.test");
    await t.request("PATCH", "/v1/me", { headers: c.headers, body: { locale: "en" } });
    const out = await json(await capture({}, { user: c }));
    expect(out.category.name).toBe("Other expenses");
    const inc = await json(await capture({ kind: "income" }, { user: c }));
    expect(inc.category.name).toBe("Other income");
    const [row] = await t.admin
      .select()
      .from(categories)
      .where(and(eq(categories.userId, c.userId), eq(categories.systemKey, "other")));
    expect(row).toBeDefined();
  });
});

describe("idempotency", () => {
  test("requires an idempotency key", async () => {
    expect((await capture({}, { key: null })).status).toBe(400);
  });

  test("a retry returns the first answer", async () => {
    const c = await t.signIn("retry@wambito.test");
    const key = "retry-1";
    const first = await capture({ amount: 99 }, { user: c, key });
    const second = await capture({ amount: 99 }, { user: c, key });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await json(second)).transaction.id).toBe((await json(first)).transaction.id);
    expect((await rows(c)).length).toBe(1);
  });
});
