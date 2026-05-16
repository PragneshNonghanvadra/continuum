import { CONTINUUM_PRODUCT_NAME, ensureSeedData, openContinuumDatabase } from "@continuum/core";
import { createApiApp } from "./app";

const db = openContinuumDatabase();
ensureSeedData(db);
const app = createApiApp({ db });

const port = Number(process.env.CONTINUUM_API_PORT ?? 5174);

Bun.serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port
});

console.log(`${CONTINUUM_PRODUCT_NAME} local API listening on http://127.0.0.1:${port}`);
