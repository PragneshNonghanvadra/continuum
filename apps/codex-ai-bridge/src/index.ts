import { createBridgeApp } from "./app";

const hostname = process.env.CONTINUUM_CODEX_BRIDGE_HOST ?? "127.0.0.1";
const port = Number(process.env.CONTINUUM_CODEX_BRIDGE_PORT ?? "4010");
const app = createBridgeApp();

Bun.serve({
  fetch: app.fetch,
  hostname,
  port
});

console.log(`Continuum Codex AI bridge listening on http://${hostname}:${port}`);
