export const MAX_CART_REQUEST_QUANTITY = 250;

export type CartErrorKind = "invalid_cart" | "validation" | "upstream";

export type CartClientError = {
  status: number;
  body: {
    error: string;
    code?: "INVALID_CART";
  };
};

export function normalizeQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (!Number.isSafeInteger(value)) return null;
  if (value < 1 || value > MAX_CART_REQUEST_QUANTITY) return null;
  return value;
}

function hasInvalidCartIdUserError(error: unknown) {
  if (
    !error ||
    typeof error !== "object" ||
    !("userErrors" in error) ||
    !Array.isArray(error.userErrors)
  ) {
    return false;
  }

  return error.userErrors.some((userError) => {
    if (!userError || typeof userError !== "object") return false;
    if (!("code" in userError) || userError.code !== "INVALID") return false;
    if (!("field" in userError) || !Array.isArray(userError.field)) {
      return false;
    }

    return userError.field.some((part: unknown) => {
      if (typeof part !== "string") return false;
      return part.replace(/[^a-z0-9]/gi, "").toLowerCase() === "cartid";
    });
  });
}

function hasShopifyUserErrors(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "userErrors" in error &&
    Array.isArray(error.userErrors)
  );
}

export function classifyShopifyCartError(error: unknown): CartErrorKind {
  if (hasInvalidCartIdUserError(error)) return "invalid_cart";
  if (hasShopifyUserErrors(error)) return "validation";

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "INVALID_CART"
  ) {
    return "invalid_cart";
  }

  if (
    error &&
    typeof error === "object" &&
    "kind" in error &&
    error.kind === "validation"
  ) {
    return "validation";
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    !(error instanceof Error)
  ) {
    return "validation";
  }

  return "upstream";
}

export function clientCartError(kind: CartErrorKind): CartClientError {
  if (kind === "invalid_cart") {
    return {
      status: 409,
      body: {
        error: "Cart is no longer available.",
        code: "INVALID_CART",
      },
    };
  }

  if (kind === "validation") {
    return {
      status: 400,
      body: { error: "Cart request is invalid." },
    };
  }

  return {
    status: 502,
    body: { error: "Cart service is temporarily unavailable." },
  };
}

function isPrivateIpv4(parts: number[]) {
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const numbers = parts.map((part) => Number(part));
  return numbers.every(
    (part, index) =>
      Number.isInteger(part) &&
      part >= 0 &&
      part <= 255 &&
      String(part) === parts[index]
  );
}

function isPrivateIpv6(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function validateBuyerIp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.includes(",") || /\s/.test(candidate)) return null;

  if (isIpv4(candidate)) {
    const parts = candidate.split(".").map((part) => Number(part));
    return isPrivateIpv4(parts) ? null : candidate;
  }

  if (/^[0-9a-f:]+$/i.test(candidate) && candidate.includes(":")) {
    return isPrivateIpv6(candidate) ? null : candidate;
  }

  return null;
}
