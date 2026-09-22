import { NextRequest, NextResponse } from "next/server";
import {
  addCartLines,
  createCart,
  getCart,
  isAllowedShopifyCart,
  isAllowedShopifyMerchandise,
  removeCartLine,
  updateCartLine,
} from "@/lib/shopify";
import {
  normalizeCartId,
  normalizeCartLineId,
  normalizeMerchandiseId,
  normalizeQuantity,
} from "@/lib/shopify-validation";
import {
  classifyShopifyCartError,
  clientCartError,
  validateBuyerIp,
} from "@/lib/shopify-cart-policy";
import {
  MAX_CART_BODY_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_MAX_KEYS,
  RATE_LIMIT_WINDOW_MS,
  isJsonContentType,
  isRequestBodyWithinLimit,
  parseJsonObject,
  pruneLocalRateLimits,
} from "@/lib/shopify-request-policy";

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function badRequest() {
  return jsonError(400, "Cart request is invalid.");
}

function serverError(error: unknown) {
  const { status, body } = clientCartError(classifyShopifyCartError(error));
  return NextResponse.json(body, { status });
}

function firstForwardedIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null
  );
}

function buyerIp(request: NextRequest) {
  return validateBuyerIp(firstForwardedIp(request));
}

function assertJsonRequest(request: NextRequest) {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return jsonError(415, "Content-Type must be application/json.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_CART_BODY_BYTES) {
    return jsonError(413, "Cart request is too large.");
  }

  return null;
}

function assertSameOrigin(request: NextRequest) {
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (requestHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
    allowedOrigins.add(`${protocol}://${requestHost}`);
  }

  const isAllowedOrigin = (value: string) => {
    try {
      return allowedOrigins.has(new URL(value).origin);
    } catch {
      return false;
    }
  };

  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return jsonError(403, "Cart request is not allowed.");
  }

  const referer = request.headers.get("referer");
  if (referer && !isAllowedOrigin(referer)) {
    return jsonError(403, "Cart request is not allowed.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return jsonError(403, "Cart request is not allowed.");
  }

  return null;
}

function assertRateLimit(request: NextRequest) {
  const now = Date.now();
  pruneLocalRateLimits(rateLimits, now, RATE_LIMIT_MAX_KEYS);
  const key = firstForwardedIp(request) ?? "unknown";
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    return jsonError(429, "Too many cart requests.");
  }
  return null;
}

function assertPublicRequest(request: NextRequest) {
  return (
    assertJsonRequest(request) ??
    assertSameOrigin(request) ??
    assertRateLimit(request)
  );
}

type JsonReadResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; tooLarge?: boolean };

async function readJson(request: NextRequest): Promise<JsonReadResult> {
  const body = await request.text();
  if (!isRequestBodyWithinLimit(body, MAX_CART_BODY_BYTES)) {
    return { ok: false, tooLarge: true };
  }
  if (!body) return { ok: false };

  const parsed = parseJsonObject(body);
  return parsed ? { ok: true, body: parsed } : { ok: false };
}

export async function GET(request: NextRequest) {
  void request;
  return jsonError(405, "Method not allowed.");
}

export async function POST(request: NextRequest) {
  const requestError = assertPublicRequest(request);
  if (requestError) return requestError;

  const json = await readJson(request);
  if (!json.ok) {
    return json.tooLarge ? jsonError(413, "Cart request is too large.") : badRequest();
  }
  const body = json.body;

  const operation = body.operation === "restore" ? "restore" : "add";
  const ip = buyerIp(request);

  try {
    if (operation === "restore") {
      const cartId = normalizeCartId(body.cartId);
      if (!cartId) return badRequest();

      const cart = await getCart(cartId, ip);
      if (!cart) {
        return NextResponse.json(
          { cart: null, code: "INVALID_CART" },
          { status: 409 }
        );
      }
      if (!isAllowedShopifyCart(cart)) return badRequest();
      return NextResponse.json({ cart });
    }

    const merchandiseId = normalizeMerchandiseId(body.merchandiseId);
    const quantity = normalizeQuantity(body.quantity);
    if (!merchandiseId || !quantity) return badRequest();

    if (!(await isAllowedShopifyMerchandise(merchandiseId, ip))) {
      return badRequest();
    }

    const cartId = normalizeCartId(body.cartId);
    if (cartId) {
      const existingCart = await getCart(cartId, ip);
      if (!existingCart) {
        return NextResponse.json(
          { cart: null, code: "INVALID_CART" },
          { status: 409 }
        );
      }
      if (!isAllowedShopifyCart(existingCart)) return badRequest();
    }
    const cart = cartId
      ? await addCartLines(cartId, merchandiseId, quantity, ip)
      : await createCart(merchandiseId, quantity, ip);
    if (!isAllowedShopifyCart(cart)) return badRequest();
    return NextResponse.json({ cart });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const requestError = assertPublicRequest(request);
  if (requestError) return requestError;

  const json = await readJson(request);
  if (!json.ok) {
    return json.tooLarge ? jsonError(413, "Cart request is too large.") : badRequest();
  }
  const body = json.body;

  const cartId = normalizeCartId(body.cartId);
  const lineId = normalizeCartLineId(body.lineId);
  const quantity = normalizeQuantity(body.quantity);
  if (!cartId || !lineId || !quantity) return badRequest();

  try {
    const ip = buyerIp(request);
    const existingCart = await getCart(cartId, ip);
    if (!existingCart) {
      return NextResponse.json(
        { cart: null, code: "INVALID_CART" },
        { status: 409 }
      );
    }
    if (!isAllowedShopifyCart(existingCart)) return badRequest();

    const cart = await updateCartLine(cartId, lineId, quantity, ip);
    if (!isAllowedShopifyCart(cart)) return badRequest();
    return NextResponse.json({ cart });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const requestError = assertPublicRequest(request);
  if (requestError) return requestError;

  const json = await readJson(request);
  if (!json.ok) {
    return json.tooLarge ? jsonError(413, "Cart request is too large.") : badRequest();
  }
  const body = json.body;

  const cartId = normalizeCartId(body.cartId);
  const lineId = normalizeCartLineId(body.lineId);
  if (!cartId || !lineId) return badRequest();

  try {
    const ip = buyerIp(request);
    const existingCart = await getCart(cartId, ip);
    if (!existingCart) {
      return NextResponse.json(
        { cart: null, code: "INVALID_CART" },
        { status: 409 }
      );
    }
    if (!isAllowedShopifyCart(existingCart)) return badRequest();

    const cart = await removeCartLine(cartId, lineId, ip);
    if (!isAllowedShopifyCart(cart)) return badRequest();
    return NextResponse.json({ cart });
  } catch (error) {
    return serverError(error);
  }
}
