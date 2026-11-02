# docs

Human docs. Live docs are kept current; `superpowers/` is history.

## Map

- `docs/design/system/`: the design system. `docs/design/system/project/tokens.json` is the source
  of all tokens: regenerate with `pnpm --filter @wambito/web tokens` and, in `apps/mobile`,
  `dart run scripts/gen-tokens.dart`. `docs/design/system/project/README.md` is the brand book;
  `docs/design/system/project/components/` per-component guidelines and previews.
- `docs/design/stage-2-mockups/`: early HTML mockups; historical, not maintained.
- `docs/brand/`: raster brand art, files `wambi-*`.
- `docs/deploy/`: `personal.md` (private install, short; the runbook is
  `deploy/personal/README.md`), `landing.md` (Cloudflare landing), `api.md` (client addresses,
  rate limits).
- `docs/mobile/`: `setup.md` (toolchain, JDK 17, emulator, tests), `release.md` (signing, APK
  build; the founder copies its commands), `parity.md` (web/app visual parity ledger), `fdroid.md`
  (F-Droid blockers).
- `docs/i18n/it-pt-sample.md`: review sample of the it/pt copy.
- `docs/privacy-policy.md`: draft.

## History: `docs/superpowers/` (read only when needed, never edit after the fact)

- `specs/`: designs; `plans/`: implementation plans; `reports/`: rulings and spikes. The root
  `AGENTS.md` names which spec explains what. They keep the names they were written with.

## Rules

- `release.md` keeps the real keystore path and alias `lukitas` (in the founder's signing key;
  re-keying breaks updates). `setup.md` keeps the AVD name `lukitas-api36`.
- No personal names, emails or domains (CI guard).
