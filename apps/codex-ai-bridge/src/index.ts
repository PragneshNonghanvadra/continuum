import { createServerLogger } from "@continuum/core";
import { createBridgeApp } from "./app";

const hostname = process.env.CONTINUUM_CODEX_BRIDGE_HOST ?? "127.0.0.1";
const port = Number(process.env.CONTINUUM_CODEX_BRIDGE_PORT ?? "4010");
const logger = createServerLogger({ service: "continuum-codex-ai-bridge" });
const app = createBridgeApp({ logger });

Bun.serve({
  fetch: app.fetch,
  hostname,
  port
});

logger.info("bridge.started", {
  provider: process.env.CONTINUUM_CODEX_BRIDGE_PROVIDER ?? "http",
  url: `http://${hostname}:${port}`
});
