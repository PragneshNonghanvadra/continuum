import { expect, test } from "bun:test";
import { navigationItems } from "./navigation";

test("desktop navigation exposes every MVP section", () => {
  expect(navigationItems.map((item) => item.id)).toEqual([
    "home",
    "capture",
    "inbox",
    "library",
    "topics",
    "revision",
    "search",
    "ask-memory",
    "settings"
  ]);
});
