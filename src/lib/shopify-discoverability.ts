export function hasShopifyStorefrontConfig() {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN?.trim() &&
      process.env.SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN?.trim()
  );
}
