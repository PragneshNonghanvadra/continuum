import { Hono } from "hono";
import { CONTINUUM_PRODUCT_NAME, type ApiHealth } from "@continuum/core";

const app = new Hono();

app.get("/api/health", (context) => {
  const response: ApiHealth = {
    ok: true,
    product: CONTINUUM_PRODUCT_NAME,
    version: "0.1.0"
  };

  return context.json(response);
});

const port = Number(process.env.CONTINUUM_API_PORT ?? 5174);

Bun.serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port
});

console.log(`${CONTINUUM_PRODUCT_NAME} local API listening on http://127.0.0.1:${port}`);
