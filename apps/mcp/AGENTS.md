# apps/mcp: the MCP server (`@wambito/mcp`)

Lets AI assistants (Claude, ChatGPT…) read and write the person's finances. Holds no data: every
tool calls the API with the assistant's token.

## Entry points

- `src/server.ts`: wires `wambitoFor: token => apiWambito(MCP_API_URL, token)`.
- `src/app.ts`: MCP server `{ name: "wambito", title: "Wambito" }`, tools and prompts from
  `@wambito/ai-assistant-tools`, protected-resource metadata, rate limit (`src/rate-limit.ts`).
- `src/api-wambito.ts`: the `Wambito` interface over the HTTP API (bearer token).
- `src/verifier.ts`: token checks. `src/config.ts`: env.
- `src/api/schema.d.ts`: generated API types: `pnpm --filter @wambito/mcp api:types` (CI diffs it).

## MCP → API

- The assistant's OAuth access token is a JWT from the API's `/auth`, `aud` = MCP_URL; the MCP
  forwards it, the API checks scopes (`apps/api/src/http/scopes.ts`).
- Dev: MCP_URL `http://localhost:3001/mcp`, MCP_API_URL `http://localhost:3000/api`
  (`.env.example`). In production Caddy routes `/mcp` to it (`deploy/personal/routes.caddy`).

## Run and test (repo root)

- `pnpm --filter @wambito/mcp dev` (API running).
- `pnpm vitest run apps/mcp`. `test/end-to-end.test.ts` and `test/api-wambito.test.ts` start the
  API test app: Docker needed.

## Traps

- Tool names, scopes and the `/mcp` path are a public contract: changing them breaks connected
  assistants.
- Tool behaviour and wording live in `packages/ai-assistant-tools`, not here.
