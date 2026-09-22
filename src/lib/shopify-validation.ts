export {
  MAX_CART_REQUEST_QUANTITY,
  normalizeQuantity,
} from "./shopify-cart-policy";

export function isShopifyGid(value: unknown, type?: string): value is string {
  if (typeof value !== "string") return false;
  const prefix = type ? `gid://shopify/${type}/` : "gid://shopify/";
  return value.startsWith(prefix) && value.length > prefix.length;
}

export function normalizeCartId(value: unknown): string | null {
  return isShopifyGid(value, "Cart") ? value : null;
}

export function normalizeMerchandiseId(value: unknown): string | null {
  return isShopifyGid(value, "ProductVariant") ? value : null;
}

export function normalizeCartLineId(value: unknown): string | null {
  return isShopifyGid(value, "CartLine") ? value : null;
}
