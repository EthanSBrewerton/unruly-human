import type { ShopifyProduct } from "./shopify-types";

export const UNRULY_SHIRT_HANDLES = [
  "men-s-box-tee",
  "short-sleeve-unisex-t-shirt-1",
  "short-sleeve-unisex-t-shirt",
  "gr-monster-unisex-t-shirt",
] as const;

export const ALLOY_JACKET_PATH = "/products/alloy-000";

const shirtHandleOrder = new Map<string, number>(
  UNRULY_SHIRT_HANDLES.map((handle, index) => [handle, index])
);

export function isUnrulyShirt(
  product: Pick<ShopifyProduct, "handle" | "productType">
) {
  return product.productType === "T-SHIRT" && shirtHandleOrder.has(product.handle);
}

export function selectUnrulyShirts(products: ShopifyProduct[]) {
  return products
    .filter(isUnrulyShirt)
    .sort(
      (left, right) =>
        shirtHandleOrder.get(left.handle)! - shirtHandleOrder.get(right.handle)!
    );
}