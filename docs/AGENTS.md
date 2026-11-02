# docs

Human docs. Live docs are kept current; `superpowers/` is history.

## Map

- `docs/design/system/`: the design system. `docs/design/system/project/tokens.json` is the source
  of all tokens (regenerate: root `AGENTS.md`). `docs/design/system/project/README.md` is the
  brand book; `docs/design/system/project/components/` per-component guidelines and previews.
- `docs/brand/`: raster brand art, files `wambi-*`.
- `docs/deploy/`: `personal.md` (private install, short; the runbook is
  `deploy/personal/README.md`), `landing.md` (Cloudflare landing), `api.md` (client addresses,
  rate limits).
- `docs/mobile/`: `setup.md` (toolchain, JDK 17, emulator, tests), `release.md` (signing, APK
  build; the founder copies its commands), `parity.md` (web/app visual parity ledger), `fdroid.md`
  (F-Droid blockers).

## History: `docs/superpowers/` (read only when needed, never edit after the fact)

- `specs/`: designs; `plans/`: implementation plans; `reports/`: rulings and spikes. The root
  `AGENTS.md` names which spec explains what. They keep the names they were written with.

## Rules

- `docs/mobile/release.md` keeps the keystore path and alias, `docs/mobile/setup.md` the AVD name:
  2b names (see root `AGENTS.md`).
