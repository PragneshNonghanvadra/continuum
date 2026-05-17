import { CONTINUUM_PRODUCT_NAME, createServerLogger, ensureSeedData, openContinuumDatabase } from "@continuum/core";
import { createApiApp } from "./app";

const logger = createServerLogger({ service: "continuum-local-api" });
const db = openContinuumDatabase();
ensureSeedData(db);
const app = createApiApp({
  db,
  logger,
  runtime: {
    autoExport: process.env.CONTINUUM_AUTO_EXPORT !== "false",
    exportDir: process.env.CONTINUUM_EXPORT_DIR
  }
});

const port = Number(process.env.CONTINUUM_API_PORT ?? 5174);

Bun.serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port
});

logger.info("api.started", {
  port,
  product: CONTINUUM_PRODUCT_NAME,
  url: `http://127.0.0.1:${port}`
});
