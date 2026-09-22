import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { PATCH, POST } from "../src/app/api/shopify/cart/route.ts";

process.env.SHOPIFY_STORE_DOMAIN = "store.example.test";
process.env.SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN = "test-token";

const CART_ID = "gid://shopify/Cart/test-cart";
const LINE_ID = "gid://shopify/CartLine/test-line";
const ALLOWED_VARIANT_ID = "gid://shopify/ProductVariant/allowed";
const OFF_LIST_VARIANT_ID = "gid://shopify/ProductVariant/off-list";

function request(method: string, body: Record<string, unknown>) {
  return new NextRequest("https://preview.example.test/api/shopify/cart", {
    method,
    headers: {
      "content-type": "application/json",
      origin: "https://preview.example.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function cart(product: { handle: string; productType: string }) {
  return {
    id: CART_ID,
    checkoutUrl: "https://checkout.example.test/cart",
    totalQuantity: 1,
    cost: {
      subtotalAmount: { amount: "20.00", currencyCode: "USD" },
      totalAmount: { amount: "20.00", currencyCode: "USD" },
    },
    lines: {
      nodes: [
        {
          id: LINE_ID,
          quantity: 1,
          cost: {
            amountPerQuantity: { amount: "20.00", currencyCode: "USD" },
            subtotalAmount: { amount: "20.00", currencyCode: "USD" },
          },
          merchandise: {
            id: OFF_LIST_VARIANT_ID,
            title: "Off-list",
            sku: null,
            barcode: null,
            availableForSale: true,
            selectedOptions: [],
            price: { amount: "20.00", currencyCode: "USD" },
            compareAtPrice: null,
            image: null,
            product: {
              title: "Off-list product",
              featuredImage: null,
              ...product,
            },
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  };
}

function installFetchMock(
  handler: (query: string, variables: Record<string, unknown>) => unknown
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const parsed = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    return jsonResponse(handler(parsed.query, parsed.variables));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("POST rejects an off-list merchandise variant before cart creation", async () => {
  let mutationCalls = 0;
  const restoreFetch = installFetchMock((query) => {
    if (query.includes("CartMerchandiseProduct")) {
      return {
        node: {
          id: OFF_LIST_VARIANT_ID,
          product: { handle: "alloy-000", productType: "JACKET" },
        },
      };
    }
    if (query.includes("mutation CreateCart")) mutationCalls += 1;
    throw new Error("Unexpected Shopify operation");
  });

  try {
    const response = await POST(
      request("POST", { merchandiseId: OFF_LIST_VARIANT_ID, quantity: 1 })
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Cart request is invalid." });
    assert.equal(mutationCalls, 0);
  } finally {
    restoreFetch();
  }
});

test("POST rejects adding to an existing cart containing an off-list product", async () => {
  let mutationCalls = 0;
  const restoreFetch = installFetchMock((query) => {
    if (query.includes("CartMerchandiseProduct")) {
      return {
        node: {
          id: ALLOWED_VARIANT_ID,
          product: { handle: "men-s-box-tee", productType: "T-SHIRT" },
        },
      };
    }
    if (query.includes("query GetCart")) {
      return { cart: cart({ handle: "alloy-000", productType: "JACKET" }) };
    }
    if (query.includes("mutation AddCartLines")) mutationCalls += 1;
    throw new Error("Unexpected Shopify operation");
  });

  try {
    const response = await POST(
      request("POST", {
        cartId: CART_ID,
        merchandiseId: ALLOWED_VARIANT_ID,
        quantity: 1,
      })
    );
    assert.equal(response.status, 400);
    assert.equal(mutationCalls, 0);
  } finally {
    restoreFetch();
  }
});

test("POST restore rejects a cart containing an off-list product", async () => {
  const restoreFetch = installFetchMock((query) => {
    if (query.includes("query GetCart")) {
      return { cart: cart({ handle: "alloy-000", productType: "JACKET" }) };
    }
    throw new Error("Unexpected Shopify operation");
  });

  try {
    const response = await POST(
      request("POST", { operation: "restore", cartId: CART_ID })
    );
    assert.equal(response.status, 400);
  } finally {
    restoreFetch();
  }
});

test("PATCH rejects updating a cart containing an off-list product", async () => {
  let mutationCalls = 0;
  const restoreFetch = installFetchMock((query) => {
    if (query.includes("query GetCart")) {
      return { cart: cart({ handle: "alloy-000", productType: "JACKET" }) };
    }
    if (query.includes("mutation UpdateCartLine")) mutationCalls += 1;
    throw new Error("Unexpected Shopify operation");
  });

  try {
    const response = await PATCH(
      request("PATCH", { cartId: CART_ID, lineId: LINE_ID, quantity: 2 })
    );
    assert.equal(response.status, 400);
    assert.equal(mutationCalls, 0);
  } finally {
    restoreFetch();
  }
});
