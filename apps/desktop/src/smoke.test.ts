import { expect, test } from "bun:test";
import { navigationItems } from "./navigation";

test("desktop shell keeps capture and review sections available", () => {
  expect(navigationItems.some((item) => item.id === "capture")).toBe(true);
  expect(navigationItems.some((item) => item.id === "inbox")).toBe(true);
  expect(navigationItems.some((item) => item.id === "ask-memory")).toBe(true);
});
