import assert from "node:assert/strict";
import test from "node:test";

import {
  CHECKOUT_SCHEMA_VERSION,
  VALID_SIZES,
  buildCheckoutSessionParams,
  getCheckoutSiteOrigin,
  isPaidUnrulySession,
  isStripeCheckoutUrl,
  isStripeSecretKeyAllowed,
  parseCheckoutInput,
} from "../src/lib/purchase.ts";

test("production accepts only Stripe live secret or restricted keys", () => {
  for (const key of ["sk_live_abc123", "rk_live_abc123"]) {
    assert.equal(isStripeSecretKeyAllowed(key, "production"), true);
  }

  for (const key of [
    undefined,
    "",
    "sk_test_abc123",
    "rk_test_abc123",
    "pk_live_abc123",
    "sk_live_",
    "dummy_key",
  ]) {
    assert.equal(isStripeSecretKeyAllowed(key, "production"), false);
  }

  for (const key of ["dummy_key", "sk_test_abc123", "rk_test_abc123"]) {
    assert.equal(isStripeSecretKeyAllowed(key, "development"), true);
  }
  assert.equal(isStripeSecretKeyAllowed(undefined, "development"), false);
});

test("accepts only the exact storefront size list", () => {
  assert.deepEqual(VALID_SIZES, ["S", "M", "L", "XL", "XXL", "3XL", "4XL"]);

  for (const size of VALID_SIZES) {
    assert.deepEqual(parseCheckoutInput({ size }), { size });
  }

  for (const body of [undefined, null, "M", [], {}, { size: "XS" }, { size: "m" }, { size: 3 }]) {
    assert.throws(() => parseCheckoutInput(body), /valid size/i);
  }
});

test("builds a server-owned $300 checkout contract and immutable order metadata", () => {
  const params = buildCheckoutSessionParams("3XL", "https://unruly.fashion");
  const price = params.line_items[0].price_data;

  assert.equal(price.currency, "usd");
  assert.equal(price.unit_amount, 30000);
  assert.deepEqual(price.product_data.images, ["https://unruly.fashion/images/DSC01001.jpg"]);
  assert.deepEqual(params.metadata, {
    app: "unruly-human",
    product: "alloy-000-bomber",
    size: "3XL",
    checkout_schema_version: CHECKOUT_SCHEMA_VERSION,
  });
  assert.deepEqual(params.payment_intent_data.metadata, params.metadata);
  assert.equal(
    params.success_url,
    "https://unruly.fashion/success?session_id={CHECKOUT_SESSION_ID}",
  );
  assert.equal(params.cancel_url, "https://unruly.fashion/#buy");
});

test("production requires a clean HTTPS SITE_URL and never derives it from a header", () => {
  assert.equal(
    getCheckoutSiteOrigin({ environment: "production", siteUrl: "https://unruly.fashion/" }),
    "https://unruly.fashion",
  );
  assert.throws(
    () => getCheckoutSiteOrigin({ environment: "production", siteUrl: undefined }),
    /SITE_URL.*required/i,
  );

  for (const siteUrl of [
    "http://unruly.fashion",
    "//unruly.fashion",
    "https://user:pass@unruly.fashion",
    "https://unruly.fashion/path",
    "https://unruly.fashion?x=1",
  ]) {
    assert.throws(
      () => getCheckoutSiteOrigin({ environment: "production", siteUrl }),
      /SITE_URL.*HTTPS/i,
    );
  }
});

test("development may use the request URL origin when SITE_URL is absent", () => {
  assert.equal(
    getCheckoutSiteOrigin({
      environment: "development",
      requestUrl: "http://localhost:3000/api/checkout",
    }),
    "http://localhost:3000",
  );
});

test("only Stripe-hosted HTTPS checkout URLs are accepted by the buyer redirect", () => {
  assert.equal(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123"), true);
  for (const value of [
    null,
    "",
    "javascript:alert(1)",
    "http://checkout.stripe.com/c/pay/test",
    "https://checkout.stripe.com.evil.test/c/pay/test",
    "https://example.com/checkout",
  ]) {
    assert.equal(isStripeCheckoutUrl(value), false);
  }
});

test("success requires a complete, paid, $300 Unruly session with valid metadata", () => {
  const session = {
    id: "cs_live_123",
    status: "complete",
    payment_status: "paid",
    mode: "payment",
    amount_total: 30000,
    currency: "usd",
    livemode: true,
    metadata: {
      app: "unruly-human",
      product: "alloy-000-bomber",
      size: "XL",
      checkout_schema_version: CHECKOUT_SCHEMA_VERSION,
    },
  };

  assert.equal(isPaidUnrulySession(session), true);
  assert.equal(isPaidUnrulySession(session, { requireLiveMode: true }), true);
  assert.equal(
    isPaidUnrulySession({ ...session, livemode: false }, { requireLiveMode: true }),
    false,
  );
  assert.equal(isPaidUnrulySession({ ...session, livemode: false }), true);
  for (const patch of [
    { payment_status: "unpaid" },
    { status: "open" },
    { amount_total: 1 },
    { currency: "gbp" },
    { metadata: { ...session.metadata, app: "another-app" } },
    { metadata: { ...session.metadata, size: "XS" } },
    { metadata: { ...session.metadata, checkout_schema_version: "0" } },
  ]) {
    assert.equal(isPaidUnrulySession({ ...session, ...patch }), false);
  }
});
