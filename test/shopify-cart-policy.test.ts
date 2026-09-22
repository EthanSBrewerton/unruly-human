import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyShopifyCartError,
  clientCartError,
  normalizeQuantity,
  validateBuyerIp,
} from "../src/lib/shopify-cart-policy.ts";
import {
  isJsonContentType,
  isRequestBodyWithinLimit,
  parseJsonObject,
} from "../src/lib/shopify-request-policy.ts";
import {
  findCompatibleVariantForOption,
  findInitialVariant,
  isOptionValueAvailable,
} from "../src/lib/shopify-variant-selection.ts";

test("normalizeQuantity accepts positive safe integers within the request bound", () => {
  assert.equal(normalizeQuantity(1), 1);
  assert.equal(normalizeQuantity(250), 250);
  assert.equal(normalizeQuantity(0), null);
  assert.equal(normalizeQuantity(251), null);
  assert.equal(normalizeQuantity(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(normalizeQuantity(1.5), null);
  assert.equal(normalizeQuantity("1"), null);
});

test("classifyShopifyCartError treats 2026-07 INVALID cartId user errors as invalid carts", () => {
  assert.equal(
    classifyShopifyCartError({
      kind: "shopify_user_errors",
      userErrors: [
        {
          code: "INVALID",
          field: ["cartId"],
          message: "The specified cart does not exist.",
        },
      ],
    }),
    "invalid_cart"
  );
  assert.equal(
    classifyShopifyCartError({
      kind: "shopify_user_errors",
      userErrors: [
        {
          code: "INVALID",
          field: ["lines", "0", "merchandiseId"],
          message: "Invalid merchandise.",
        },
      ],
    }),
    "validation"
  );
  assert.equal(
    classifyShopifyCartError({ message: "cart does not exist" }),
    "validation"
  );
  assert.equal(
    classifyShopifyCartError({ code: "INVALID_CART", message: "bad cart" }),
    "invalid_cart"
  );
  assert.equal(classifyShopifyCartError(new Error("network down")), "upstream");
});

test("clientCartError returns stable sanitized messages", () => {
  assert.deepEqual(clientCartError("invalid_cart"), {
    status: 409,
    body: { error: "Cart is no longer available.", code: "INVALID_CART" },
  });
  assert.deepEqual(clientCartError("validation"), {
    status: 400,
    body: { error: "Cart request is invalid." },
  });
  assert.deepEqual(clientCartError("upstream"), {
    status: 502,
    body: { error: "Cart service is temporarily unavailable." },
  });
});

test("validateBuyerIp accepts public IPs and rejects private or malformed input", () => {
  assert.equal(validateBuyerIp("8.8.8.8"), "8.8.8.8");
  assert.equal(validateBuyerIp("2001:4860:4860::8888"), "2001:4860:4860::8888");
  assert.equal(validateBuyerIp("10.0.0.1"), null);
  assert.equal(validateBuyerIp("172.16.0.1"), null);
  assert.equal(validateBuyerIp("192.168.1.1"), null);
  assert.equal(validateBuyerIp("127.0.0.1"), null);
  assert.equal(validateBuyerIp("not an ip"), null);
});

test("isJsonContentType accepts only the exact application/json media type", () => {
  assert.equal(isJsonContentType("application/json"), true);
  assert.equal(isJsonContentType("Application/JSON; charset=utf-8"), true);
  assert.equal(isJsonContentType("application/jsonp"), false);
  assert.equal(isJsonContentType("text/plain"), false);
  assert.equal(isJsonContentType(null), false);
});

test("isRequestBodyWithinLimit measures UTF-8 bytes", () => {
  assert.equal(isRequestBodyWithinLimit("1234", 4), true);
  assert.equal(isRequestBodyWithinLimit("12345", 4), false);
  assert.equal(isRequestBodyWithinLimit("😀", 4), true);
  assert.equal(isRequestBodyWithinLimit("😀a", 4), false);
});

test("parseJsonObject rejects valid JSON that is not a request object", () => {
  assert.deepEqual(parseJsonObject('{"operation":"restore"}'), {
    operation: "restore",
  });
  assert.equal(parseJsonObject("null"), null);
  assert.equal(parseJsonObject("[]"), null);
  assert.equal(parseJsonObject('"text"'), null);
  assert.equal(parseJsonObject("1"), null);
  assert.equal(parseJsonObject("{"), null);
});

const sparseProduct = {
  id: "gid://shopify/Product/1",
  handle: "sparse",
  title: "Sparse",
  description: "",
  descriptionHtml: "",
  vendor: "Ethan S. Brewerton",
  productType: "Shirts",
  updatedAt: "2026-09-20T03:00:00Z",
  availableForSale: true,
  featuredImage: null,
  images: [],
  priceRange: {
    minVariantPrice: { amount: "10.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "10.00", currencyCode: "USD" },
  },
  options: [
    { id: "color", name: "Color", values: ["Red", "Blue"] },
    { id: "size", name: "Size", values: ["S", "M"] },
  ],
  variants: [
    {
      id: "gid://shopify/ProductVariant/red-s",
      title: "Red / S",
      sku: null,
      barcode: null,
      availableForSale: true,
      selectedOptions: [
        { name: "Color", value: "Red" },
        { name: "Size", value: "S" },
      ],
      price: { amount: "10.00", currencyCode: "USD" },
      compareAtPrice: null,
      image: null,
    },
    {
      id: "gid://shopify/ProductVariant/blue-m",
      title: "Blue / M",
      sku: null,
      barcode: null,
      availableForSale: true,
      selectedOptions: [
        { name: "Color", value: "Blue" },
        { name: "Size", value: "M" },
      ],
      price: { amount: "10.00", currencyCode: "USD" },
      compareAtPrice: null,
      image: null,
    },
  ],
};

test("sparse variant options remain selectable when any available variant contains the value", () => {
  assert.equal(isOptionValueAvailable(sparseProduct, "Color", "Blue"), true);
  assert.equal(isOptionValueAvailable(sparseProduct, "Size", "M"), true);
  assert.equal(isOptionValueAvailable(sparseProduct, "Size", "XL"), false);
});

test("clicking a sparse option moves selection to a compatible available variant", () => {
  const variant = findCompatibleVariantForOption(
    sparseProduct,
    "Color",
    "Blue"
  );

  assert.equal(variant?.id, "gid://shopify/ProductVariant/blue-m");
  assert.deepEqual(
    Object.fromEntries(
      variant?.selectedOptions.map((option) => [option.name, option.value]) ?? []
    ),
    { Color: "Blue", Size: "M" }
  );
});

test("variant deep links accept Shopify IDs or their stable trailing key", () => {
  assert.equal(
    findInitialVariant(sparseProduct, "blue-m")?.id,
    "gid://shopify/ProductVariant/blue-m"
  );
  assert.equal(
    findInitialVariant(
      sparseProduct,
      "gid://shopify/ProductVariant/red-s"
    )?.id,
    "gid://shopify/ProductVariant/red-s"
  );
  assert.equal(
    findInitialVariant(sparseProduct, "unknown")?.id,
    "gid://shopify/ProductVariant/red-s"
  );
});
