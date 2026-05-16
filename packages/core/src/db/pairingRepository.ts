import type { Database } from "bun:sqlite";
import type { ExtensionPairing } from "../domain";
import { mapExtensionPairing, type ExtensionPairingRow } from "./rowMappers";

export function createExtensionPairing(db: Database, browserName: string): ExtensionPairing {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const pairingToken = `cnt_${crypto.randomUUID().replaceAll("-", "")}_${crypto.randomUUID().replaceAll("-", "")}`;

  db.prepare(`
    insert into extension_pairings (id, pairing_token, browser_name, status, created_at, updated_at)
    values (?, ?, ?, 'active', ?, ?)
  `).run(id, pairingToken, browserName, now, now);

  const pairing = getExtensionPairingByToken(db, pairingToken);
  if (!pairing) {
    throw new Error("Failed to create extension pairing");
  }
  return pairing;
}

export function getExtensionPairingByToken(db: Database, pairingToken: string): ExtensionPairing | undefined {
  const row = db
    .query<ExtensionPairingRow, [string]>("select * from extension_pairings where pairing_token = ? and status = 'active'")
    .get(pairingToken);
  return row ? mapExtensionPairing(row) : undefined;
}
