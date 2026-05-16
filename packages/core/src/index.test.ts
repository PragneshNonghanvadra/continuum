import { expect, test } from "bun:test";
import { CONTINUUM_PRODUCT_NAME } from "./index";

test("names the product", () => {
  expect(CONTINUUM_PRODUCT_NAME).toBe("Continuum");
});
