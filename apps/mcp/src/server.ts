import { serve } from "@hono/node-server";
import { apiWambito } from "./api-wambito.ts";
import { createMcpApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { jwtVerifier } from "./verifier.ts";

const config = loadConfig(process.env);
const app = createMcpApp({
  config,
  verifier: jwtVerifier(config),
  wambitoFor: (token) => apiWambito(config.MCP_API_URL, token),
});

serve({ fetch: app.fetch, port: config.MCP_PORT }, (info) => {
  console.log(`Wambito MCP on :${info.port}, serving ${config.MCP_URL}`);
});
