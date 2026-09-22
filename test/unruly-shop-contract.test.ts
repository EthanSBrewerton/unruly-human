import assert from "node:assert/strict";
import test from "node:test";

import type { ShopifyProduct } from "../src/lib/shopify-types.ts";
import {
  ALLOY_JACKET_PATH,
  UNRULY_SHIRT_HANDLES,
  isUnrulyShirt,
  selectUnrulyShirts,
} from "../src/lib/unruly-shop-contract.ts";

function product(handle: string, productType = "T-SHIRT") {
  return { handle, productType } as ShopifyProduct;
}

test("Unruly apparel catalog is bounded to the four live Shopify shirts", () => {
  assert.deepEqual(UNRULY_SHIRT_HANDLES, [
    "men-s-box-tee",
    "short-sleeve-unisex-t-shirt-1",
    "short-sleeve-unisex-t-shirt",
    "gr-monster-unisex-t-shirt",
  ]);

  const selected = selectUnrulyShirts([
    product("unrelated-shirt"),
    product("gr-monster-unisex-t-shirt"),
    product("men-s-box-tee"),
    product("short-sleeve-unisex-t-shirt"),
    product("short-sleeve-unisex-t-shirt-1"),
    product("men-s-box-tee", "HOODIE"),
  ]);

  assert.deepEqual(
    selected.map(({ handle }) => handle),
    [...UNRULY_SHIRT_HANDLES]
  );
  assert.equal(isUnrulyShirt(product("unrelated-shirt")), false);
});

test("Alloy jacket remains on its separate original product route", () => {
  assert.equal(ALLOY_JACKET_PATH, "/products/alloy-000");
  assert.equal(UNRULY_SHIRT_HANDLES.includes("alloy-000" as never), false);
});