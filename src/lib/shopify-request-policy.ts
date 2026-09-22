export const MAX_CART_BODY_BYTES = 4096;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 60;
export const RATE_LIMIT_MAX_KEYS = 500;

export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const [mediaType] = value.split(";", 1);
  return mediaType.trim().toLowerCase() === "application/json";
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function isRequestBodyWithinLimit(
  value: string,
  maxBytes = MAX_CART_BODY_BYTES
): boolean {
  return utf8ByteLength(value) <= maxBytes;
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type LocalRateLimitEntry = { count: number; resetAt: number };

export function pruneLocalRateLimits(
  limits: Map<string, LocalRateLimitEntry>,
  now: number,
  maxKeys = RATE_LIMIT_MAX_KEYS
) {
  for (const [key, value] of Array.from(limits.entries())) {
    if (value.resetAt <= now) limits.delete(key);
  }

  while (limits.size > maxKeys) {
    const oldestKey = limits.keys().next().value as string | undefined;
    if (!oldestKey) break;
    limits.delete(oldestKey);
  }
}
