# packages/ai-assistant-tools (`@wambito/ai-assistant-tools`)

The MCP tools, prompts and server instructions, independent of transport. `apps/mcp` serves them.

## Entry points

- `src/wambito.ts`: the `Wambito` interface (domain operations the tools need).
- `src/tools/*`: one tool per file, each gets `ToolContext { wambito, userId, now }`;
  `src/catalog.ts` lists them, `src/tool.ts` the shape.
- `src/prompts.ts`, `src/instructions.ts` (server instructions), `src/text.ts` (formatting),
  `src/errors.ts`.
- `src/memory.ts`: `MemoryWambito`, an in-memory `Wambito` for tests and the demo.

## Test

- `pnpm vitest run --project @wambito/ai-assistant-tools` (no Docker).
- `pnpm vitest run packages/...` finds no files: always `--project`.

## Rules

- The "luka"/"lukas"/"palo" money lines in `src/instructions.ts` are Colombian slang: never rename.
- Tool names and their input shapes are a public contract (connected assistants).
- Names, notes and category names are user data: tool output marks them as data, never
  instructions. Keep that marking.
