import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("checkout route delegates validation/configuration and does not trust Origin", () => {
  const source = read("src/app/api/checkout/route.ts");
  assert.match(source, /parseCheckoutInput/);
  assert.match(source, /getCheckoutSiteOrigin/);
  assert.match(source, /buildCheckoutSessionParams/);
  assert.match(source, /isStripeSecretKeyAllowed/);
  assert.doesNotMatch(source, /headers\.get\(["']origin["']\)/i);
  assert.doesNotMatch(source, /dummy_key/);
});

test("storefront rejects unsuccessful API responses and invalid Stripe URLs", () => {
  const source = read("src/app/page.tsx");
  assert.match(source, /response\.ok/);
  assert.match(source, /isStripeCheckoutUrl/);
  assert.match(source, /throw new Error/);
  assert.match(source, /alert\(/);
});

test("success page is server-verified, requires live mode in production, and is tri-state", () => {
  const page = read("src/app/success/page.tsx");
  const content = read("src/app/success/success-content.tsx");
  assert.doesNotMatch(page, /["']use client["']/);
  assert.match(page, /STRIPE_SECRET_KEY/);
  assert.match(page, /checkout\.sessions\.retrieve/);
  assert.match(page, /isPaidUnrulySession/);
  assert.match(page, /requireLiveMode/);
  assert.match(content, /confirmed.*not-confirmed.*unavailable/s);
  assert.match(content, /verification could not complete/i);
  assert.match(content, /payment may still be recorded with Stripe/i);
  assert.match(content, /refresh/i);
  assert.doesNotMatch(`${page}\n${content}`, /confirmation email|tracking information|support|receipt/i);
});

test("unfinished webhook and Resend dependency are removed", () => {
  assert.equal(existsSync(new URL("../src/app/api/webhooks/stripe/route.ts", import.meta.url)), false);
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.dependencies.resend, undefined);
  assert.equal(packageJson.dependencies["@stripe/stripe-js"], undefined);
  assert.equal(packageJson.dependencies.next, "16.2.10");
  assert.equal(packageJson.devDependencies["eslint-config-next"], "16.2.10");
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
});

test("migration docs contain all payment-first production gates and fulfillment runbook", () => {
  const report = read("MIGRATION_REPORT.md");
  assert.match(report, /STRIPE_SECRET_KEY/);
  assert.match(report, /SITE_URL/);
  assert.match(report, /webhook.*deferred|deferred.*webhook/i);
  assert.match(report, /Resend.*deferred|deferred.*Resend/i);
  assert.match(report, /sk_live_|rk_live_/);
  assert.match(report, /livemode.*true/i);
  assert.match(report, /Customer emails.*Successful payments/i);
  assert.match(report, /manually (?:enable|enabled).*verif|manually verif/i);
  assert.match(report, /disable.*(?:obsolete|old|existing).*event destination/i);
  assert.match(report, /manual fulfillment ledger/i);
  assert.match(report, /public support contact.*unresolved/i);
  assert.doesNotMatch(report, /ethansbrewerton@gmail\.com/);
  assert.doesNotMatch(report, /RESEND_API_KEY\*\* \(Required\)/);
});
