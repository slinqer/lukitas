# apps/web (`@wambito/web`)

React Router 8 (framework mode, SPA + prerender): the public landing and roadmap (prerendered,
es/en/it/pt), the signed-in app (`/app/*`), sign-in, onboarding (`/welcome`), OAuth consent for
assistants, and a fake-backend demo (`/demo/*`).

## Entry points

- `app/root.tsx` (document; theme bootstrap script first in `<head>`), `app/routes.ts` (route
  table; landing-only builds drop the app layout), `react-router.config.ts` (prerender list,
  build dir `WAMBITO_BUILD_DIR` or `build`), `vite.config.ts` (mascot chunk named `mascot-*`).
- `app/routes/*` thin route modules; `app/features/<feature>/` screens, models, stories;
  `app/ui/` shared components; `app/wambi/` the mascot (`app/wambi/experimental/` 3D, never on
  the landing); `app/api/` OpenAPI client; `app/auth/` session and passkeys; `app/demo/`;
  `app/feedback/` sounds, vibration, `Celebration`; `app/theme/`; `app/site/` origins/build env.
- Storage: only `readStored/writeStored/removeStored` in `app/lib/stored.ts` (keys
  `wambito.<name>`, `sessionArea()` for session data). The old-key move is `2b: remove`.
- i18n: `app/i18n/messages/{es,en,it,pt}.json` public pages, `app.{es,en,it,pt}.json` the rest.
  `messages.test.ts` enforces parity, ICU, PT-PT, no slang in it/pt, no old names.

## Talks to

- API at `/api` on the same origin (Vite proxies it in dev). Types: `app/api/schema.d.ts`
  (generated; commands for it and `tokens.css`: root `AGENTS.md`).

## Commands (repo root)

- Dev: `pnpm --filter @wambito/web dev` (needs the root stack: `docker compose up -d`).
- Unit + Storybook tests: `pnpm vitest run apps/web`; one project
  `--project "@wambito/web (unit)"` or `"@wambito/web (storybook)"` (Chromium).
- Storybook: `pnpm --filter @wambito/web storybook` (:6006). OG images: `pnpm --filter @wambito/web og`.
- e2e: `E2E_NOW=2026-10-21T15:00:00Z docker compose up -d --build` (value from
  `e2e/helpers.ts`), then `pnpm --filter @wambito/web e2e` | `e2e:landing` | `e2e:landing-only` |
  `e2e:landing-only-app`. Afterwards `docker compose stop` (never `down -v`).

## Landing builds

- Normal `build/` (landing + app). `VITE_LANDING_ONLY=true` via `scripts/build-landing.ts`
  (`build:landing`): landing + 404 for the Worker. `VITE_APP_URL` points the CTA at the app origin;
  `VITE_SITE_URL` sets canonical/sitemap (default `https://wambito.test`). The VPS builds with
  `WAMBITO_BUILD_DIR=build-personal`.

## Traps

- Money slang (see root `AGENTS.md`) is in the Spanish copy.
  `app/features/landing/money-words.ts` / `MoneyHeadline.tsx` hold money words per language: edit
  with care.
- The landing header must fit one row at 320px in every language (e2e checks it).
- Landing HTML must not link files named after the mascot module (hence `mascot-*`).
- Storybook story titles are the parity ids in `apps/mobile/test/parity/parity.json`.
- Built e2e suites run without JavaScript by default; the dev e2e fails in global-setup without
  the pinned `E2E_NOW` in the API.
