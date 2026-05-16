import { expect, test } from "bun:test";
import { createMemoryDatabase } from "./connection";
import { createExtensionPairing, getExtensionPairingByToken } from "./pairingRepository";

test("creates and validates local extension pairings", () => {
  const db = createMemoryDatabase();

  const pairing = createExtensionPairing(db, "Chrome");

  expect(pairing.browserName).toBe("Chrome");
  expect(pairing.status).toBe("active");
  expect(pairing.pairingToken.length).toBeGreaterThan(20);
  expect(getExtensionPairingByToken(db, pairing.pairingToken)?.id).toBe(pairing.id);
});
