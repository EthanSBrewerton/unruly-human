import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("jacket size selector includes sizes through 4XL", () => {
  const page = readFileSync("src/app/page.tsx", "utf8");

  assert.match(
    page,
    /\["S", "M", "L", "XL", "XXL", "3XL", "4XL"\]\.map/,
  );
});
