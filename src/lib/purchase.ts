import type Stripe from "stripe";

export const VALID_SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "4XL"] as const;
export const CHECKOUT_SCHEMA_VERSION = "1";

export type JacketSize = (typeof VALID_SIZES)[number];

export class CheckoutInputError extends Error {}

export function isStripeSecretKeyAllowed(
  key: string | undefined,
  environment: string | undefined,
): key is string {
  if (!key) return false;
  if (environment !== "production") return true;

  return /^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key);
}

export function parseCheckoutInput(body: unknown): { size: JacketSize } {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("size" in body) ||
    typeof body.size !== "string" ||
    !VALID_SIZES.includes(body.size as JacketSize)
  ) {
    throw new CheckoutInputError(
      `Please select a valid size: ${VALID_SIZES.join(", ")}.`,
    );
  }

  return { size: body.size as JacketSize };
}

type SiteOriginOptions = {
  environment?: string;
  siteUrl?: string;
  requestUrl?: string;
};

export function getCheckoutSiteOrigin({
  environment,
  siteUrl,
  requestUrl,
}: SiteOriginOptions): string {
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      const isCleanOrigin =
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "";

      if (!isCleanOrigin) throw new Error("invalid origin");
      return url.origin;
    } catch {
      throw new Error("SITE_URL must be a valid HTTPS origin with no path, query, or credentials.");
    }
  }

  if (environment === "production") {
    throw new Error("SITE_URL is required in production and must be a valid HTTPS origin.");
  }

  if (!requestUrl) {
    throw new Error("A request URL is required when SITE_URL is not configured.");
  }

  return new URL(requestUrl).origin;
}

function orderMetadata(size: JacketSize): Record<string, string> {
  return {
    app: "unruly-human",
    product: "alloy-000-bomber",
    size,
    checkout_schema_version: CHECKOUT_SCHEMA_VERSION,
  };
}

export function buildCheckoutSessionParams(
  size: JacketSize,
  siteOrigin: string,
): Stripe.Checkout.SessionCreateParams {
  const metadata = orderMetadata(size);

  return {
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Alloy 000 Bomber Jacket",
            description: `Size: ${size} — Limited Edition Biomechanical Art`,
            images: ["https://unruly.fashion/images/DSC01001.jpg"],
          },
          unit_amount: 30000,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${siteOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/#buy`,
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "JP"],
    },
    metadata,
    payment_intent_data: { metadata },
  };
}

export function isStripeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

export function isCheckoutSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^cs_(?:test|live)_[A-Za-z0-9]+$/.test(value) &&
    value.length <= 255
  );
}

export function isPaidUnrulySession(
  session: unknown,
  { requireLiveMode = false }: { requireLiveMode?: boolean } = {},
): boolean {
  if (typeof session !== "object" || session === null) return false;

  const candidate = session as {
    status?: unknown;
    payment_status?: unknown;
    mode?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    livemode?: unknown;
    metadata?: Record<string, unknown> | null;
  };
  const metadata = candidate.metadata;

  return (
    candidate.status === "complete" &&
    candidate.payment_status === "paid" &&
    candidate.mode === "payment" &&
    candidate.amount_total === 30000 &&
    candidate.currency === "usd" &&
    (!requireLiveMode || candidate.livemode === true) &&
    metadata?.app === "unruly-human" &&
    metadata.product === "alloy-000-bomber" &&
    metadata.checkout_schema_version === CHECKOUT_SCHEMA_VERSION &&
    typeof metadata.size === "string" &&
    VALID_SIZES.includes(metadata.size as JacketSize)
  );
}
