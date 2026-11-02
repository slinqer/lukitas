# packages/importers (`@wambito/importers`)

CSV importers that turn another app's export into Wambito transactions and categories.

## Entry points

- `src/index.ts`; `src/budge/parse.ts` + `src/budge/derive.ts` (the Budge export);
  `src/category-style.ts`.
- Used by the API's import route (`apps/api/src/routes/imports.ts`).

## Test

- `pnpm vitest run --project @wambito/importers`.

## Rules

- Fixtures are invented, never a real person's export.
- Amounts become integer cents.
