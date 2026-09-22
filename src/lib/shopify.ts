import "server-only";
import { SHOP_CATEGORIES } from "./shop-categories";
import { isUnrulyShirt, selectUnrulyShirts } from "./unruly-shop-contract";
import { hasShopifyStorefrontConfig } from "./shopify-discoverability";
import { sanitizeProductDescription } from "./shopify-description";
import type {
  ShopifyCart,
  ShopifyCartLine,
  ShopifyCollection,
  ShopifyImage,
  ShopifyProduct,
  ShopifyProductVariant,
} from "./shopify-types";

export type {
  ShopifyCart,
  ShopifyCartLine,
  ShopifyCollection,
  ShopifyImage,
  ShopifyMoney,
  ShopifyProduct,
  ShopifyProductOption,
  ShopifyProductVariant,
  ShopifySelectedOption,
} from "./shopify-types";

type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyUserError = {
  code?: string | null;
  field: string[] | null;
  message: string;
};

type CartPayload = {
  cart: { id: string } | null;
  userErrors: ShopifyUserError[];
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type ProductNode = Omit<ShopifyProduct, "images" | "variants"> & {
  images: {
    nodes: ShopifyImage[];
    pageInfo: PageInfo;
  };
  variants: {
    nodes: ShopifyProductVariant[];
    pageInfo: PageInfo;
  };
};

type CartNode = Omit<ShopifyCart, "lines"> & {
  lines: {
    nodes: ShopifyCartLine[];
    pageInfo: PageInfo;
  };
};

type ProductConnection = {
  nodes: ProductNode[];
  pageInfo: PageInfo;
};

type ShopCollectionData = {
  collection: {
    id: string;
    handle: string;
    title: string;
    description: string;
    descriptionHtml: string;
    image: ShopifyImage | null;
    products: ProductConnection;
  } | null;
};

export class ShopifyCartError extends Error {
  kind: "invalid_cart" | "validation";
  code?: "INVALID_CART";

  constructor(kind: "invalid_cart" | "validation") {
    super(kind);
    this.name = "ShopifyCartError";
    this.kind = kind;
    if (kind === "invalid_cart") this.code = "INVALID_CART";
  }
}

const VARIANT_FRAGMENT = `
  fragment VariantFields on ProductVariant {
    id
    title
    sku
    barcode
    availableForSale
    selectedOptions { name value }
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    image {
      url
      altText
      width
      height
    }
  }
`;

const PRODUCT_FRAGMENT = `
  ${VARIANT_FRAGMENT}
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    updatedAt
    availableForSale
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 250) {
      nodes {
        url
        altText
        width
        height
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    options {
      id
      name
      values
    }
    variants(first: 250) {
      nodes {
        ...VariantFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 250) {
      nodes {
        id
        quantity
        cost {
          amountPerQuantity { amount currencyCode }
          subtotalAmount { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            sku
            barcode
            availableForSale
            selectedOptions { name value }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            image {
              url
              altText
              width
              height
            }
            product {
              title
              handle
              productType
              featuredImage {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CART_LINES_SELECTION = `
    nodes {
      id
      quantity
      cost {
        amountPerQuantity { amount currencyCode }
        subtotalAmount { amount currencyCode }
      }
      merchandise {
        ... on ProductVariant {
          id
          title
          sku
          barcode
          availableForSale
          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          image {
            url
            altText
            width
            height
          }
          product {
            title
            handle
            productType
            featuredImage {
              url
              altText
              width
              height
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
`;

function getShopifyEndpoint() {
  if (!hasShopifyStorefrontConfig()) {
    throw new Error("Shopify storefront environment is not configured.");
  }

  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN!.trim();
  const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_ACCESS_TOKEN!.trim();
  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return {
    url: `https://${domain}/api/2026-07/graphql.json`,
    token,
  };
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  init?: {
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
    buyerIp?: string | null;
  }
): Promise<T> {
  const { url, token } = getShopifyEndpoint();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Shopify-Storefront-Private-Token": token,
  };
  if (init?.buyerIp) {
    headers["Shopify-Storefront-Buyer-IP"] = init.buyerIp;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: init?.cache,
    next: init?.next,
  });

  if (!response.ok) {
    throw new Error(`Shopify request failed with ${response.status}.`);
  }

  const json = (await response.json()) as ShopifyGraphqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Shopify response did not include data.");
  }
  return json.data;
}

function flattenProduct(product: ProductNode): ShopifyProduct {
  return {
    ...product,
    descriptionHtml: sanitizeProductDescription(product.descriptionHtml),
    images: product.images.nodes,
    variants: product.variants.nodes,
  };
}

function isInvalidCartUserError(error: ShopifyUserError) {
  if (error.code !== "INVALID") return false;
  return error.field?.some(
    (part) => part.replace(/[^a-z0-9]/gi, "").toLowerCase() === "cartid"
  );
}

async function handleCartPayload(
  payload: CartPayload,
  buyerIp: string | null | undefined,
  options?: { existingCart?: boolean }
): Promise<ShopifyCart> {
  if (payload.userErrors.length > 0) {
    if (payload.userErrors.some(isInvalidCartUserError)) {
      throw new ShopifyCartError("invalid_cart");
    }
    throw new ShopifyCartError("validation");
  }

  const cartId = payload.cart?.id;
  if (!cartId) throw new ShopifyCartError("validation");

  const cart = await getCart(cartId, buyerIp);
  if (!cart) {
    throw new ShopifyCartError(options?.existingCart ? "invalid_cart" : "validation");
  }
  return cart;
}

export async function getShopProducts(): Promise<ShopifyProduct[]> {
  const collections = await getShopCollections();
  const uniqueProducts = new Map<string, ShopifyProduct>();
  for (const collection of collections) {
    for (const product of collection.products) {
      uniqueProducts.set(product.id, product);
    }
  }
  return selectUnrulyShirts(Array.from(uniqueProducts.values()));
}

export async function getShopCollections(): Promise<ShopifyCollection[]> {
  const collections = await Promise.all(
    SHOP_CATEGORIES.map((category) => getShopCollection(category.handle))
  );
  return collections.filter(
    (collection): collection is ShopifyCollection => collection !== null
  );
}

export async function getShopCollection(
  handle: string
): Promise<ShopifyCollection | null> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let collectionDetails: Omit<ShopifyCollection, "products"> | null = null;

  do {
    const data: ShopCollectionData = await shopifyFetch<ShopCollectionData>(
      `
        ${PRODUCT_FRAGMENT}
        query ShopCollection($handle: String!, $after: String) {
          collection(handle: $handle) {
            id
            handle
            title
            description
            descriptionHtml
            image {
              url
              altText
              width
              height
            }
            products(first: 100, after: $after) {
              nodes {
                ...ProductFields
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
      { handle, after: cursor },
      { next: { revalidate: 300 } }
    );

    const page = data.collection?.products;
    if (!page || !data.collection) return null;
    collectionDetails ??= {
      id: data.collection.id,
      handle: data.collection.handle,
      title: data.collection.title,
      description: data.collection.description,
      descriptionHtml: data.collection.descriptionHtml,
      image: data.collection.image,
    };

    for (const product of page.nodes) {
      products.push(await hydrateProduct(product));
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  return collectionDetails ? { ...collectionDetails, products } : null;
}

export async function getShopProduct(
  handle: string
): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<{ product: ProductNode | null }>(
    `
      ${PRODUCT_FRAGMENT}
      query ShopProduct($handle: String!) {
        product(handle: $handle) {
          ...ProductFields
        }
      }
    `,
    { handle },
    { next: { revalidate: 300 } }
  );
  return data.product ? hydrateProduct(data.product) : null;
}

async function hydrateProduct(product: ProductNode): Promise<ShopifyProduct> {
  const images = [...product.images.nodes];
  let imagePageInfo = product.images.pageInfo;
  let imageCursor = imagePageInfo.endCursor;
  const variants = [...product.variants.nodes];
  let variantPageInfo = product.variants.pageInfo;
  let variantCursor = variantPageInfo.endCursor;

  while (imagePageInfo.hasNextPage && imageCursor) {
    const imagePage = await getProductImages(product.id, imageCursor);
    images.push(...imagePage.nodes);
    imagePageInfo = imagePage.pageInfo;
    imageCursor = imagePageInfo.endCursor;
  }

  while (variantPageInfo.hasNextPage && variantCursor) {
    const variantPage = await getProductVariants(product.id, variantCursor);
    variants.push(...variantPage.nodes);
    variantPageInfo = variantPage.pageInfo;
    variantCursor = variantPageInfo.endCursor;
  }

  return flattenProduct({
    ...product,
    images: { nodes: images, pageInfo: imagePageInfo },
    variants: { nodes: variants, pageInfo: variantPageInfo },
  });
}

async function getProductImages(
  productId: string,
  after: string
): Promise<{ nodes: ShopifyImage[]; pageInfo: PageInfo }> {
  const data = await shopifyFetch<{
    product: {
      images: {
        nodes: ShopifyImage[];
        pageInfo: PageInfo;
      };
    } | null;
  }>(
    `
      query ProductImages($productId: ID!, $after: String) {
        product(id: $productId) {
          images(first: 250, after: $after) {
            nodes {
              url
              altText
              width
              height
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
    { productId, after },
    { next: { revalidate: 300 } }
  );

  return (
    data.product?.images ?? {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    }
  );
}

async function getProductVariants(
  productId: string,
  after: string
): Promise<{ nodes: ShopifyProductVariant[]; pageInfo: PageInfo }> {
  const data = await shopifyFetch<{
    product: {
      variants: {
        nodes: ShopifyProductVariant[];
        pageInfo: PageInfo;
      };
    } | null;
  }>(
    `
      ${VARIANT_FRAGMENT}
      query ProductVariants($productId: ID!, $after: String) {
        product(id: $productId) {
          variants(first: 250, after: $after) {
            nodes {
              ...VariantFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
    { productId, after },
    { next: { revalidate: 300 } }
  );

  return (
    data.product?.variants ?? {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    }
  );
}

export async function getCart(
  cartId: string,
  buyerIp?: string | null
): Promise<ShopifyCart | null> {
  const data = await shopifyFetch<{
    cart: CartNode | null;
  }>(
    `
      ${CART_FRAGMENT}
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          ...CartFields
        }
      }
    `,
    { cartId },
    { cache: "no-store", buyerIp }
  );

  if (!data.cart) return null;

  const lines = [...data.cart.lines.nodes];
  let cursor = data.cart.lines.pageInfo.endCursor;
  let hasNextPage = data.cart.lines.pageInfo.hasNextPage;

  while (hasNextPage && cursor) {
    const page = await getCartLines(cartId, cursor, buyerIp);
    lines.push(...page.nodes);
    cursor = page.pageInfo.endCursor;
    hasNextPage = page.pageInfo.hasNextPage;
  }

  return {
    ...data.cart,
    lines,
  };
}

export function isAllowedShopifyCart(cart: ShopifyCart) {
  return cart.lines.every((line) => isUnrulyShirt(line.merchandise.product));
}

export async function isAllowedShopifyMerchandise(
  merchandiseId: string,
  buyerIp?: string | null
) {
  const data = await shopifyFetch<{
    node: {
      id: string;
      product: { handle: string; productType: string };
    } | null;
  }>(
    `
      query CartMerchandiseProduct($merchandiseId: ID!) {
        node(id: $merchandiseId) {
          ... on ProductVariant {
            id
            product { handle productType }
          }
        }
      }
    `,
    { merchandiseId },
    { cache: "no-store", buyerIp }
  );

  return Boolean(data.node && isUnrulyShirt(data.node.product));
}

async function getCartLines(
  cartId: string,
  after: string,
  buyerIp?: string | null
): Promise<{ nodes: ShopifyCartLine[]; pageInfo: PageInfo }> {
  const data = await shopifyFetch<{
    cart: {
      lines: {
        nodes: ShopifyCartLine[];
        pageInfo: PageInfo;
      };
    } | null;
  }>(
    `
      query GetCartLines($cartId: ID!, $after: String) {
        cart(id: $cartId) {
          lines(first: 250, after: $after) {
            ${CART_LINES_SELECTION}
          }
        }
      }
    `,
    { cartId, after },
    { cache: "no-store", buyerIp }
  );

  if (!data.cart) throw new ShopifyCartError("invalid_cart");
  return data.cart.lines;
}

export async function createCart(
  merchandiseId: string,
  quantity: number,
  buyerIp?: string | null
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartCreate: CartPayload }>(
    `
      mutation CreateCart($lines: [CartLineInput!]) {
        cartCreate(input: { lines: $lines }) {
          cart { id }
          userErrors { code field message }
        }
      }
    `,
    { lines: [{ merchandiseId, quantity }] },
    { cache: "no-store", buyerIp }
  );

  return handleCartPayload(data.cartCreate, buyerIp);
}

export async function addCartLines(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  buyerIp?: string | null
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesAdd: CartPayload }>(
    `
      mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart { id }
          userErrors { code field message }
        }
      }
    `,
    { cartId, lines: [{ merchandiseId, quantity }] },
    { cache: "no-store", buyerIp }
  );

  return handleCartPayload(data.cartLinesAdd, buyerIp, { existingCart: true });
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
  buyerIp?: string | null
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesUpdate: CartPayload }>(
    `
      mutation UpdateCartLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart { id }
          userErrors { code field message }
        }
      }
    `,
    { cartId, lines: [{ id: lineId, quantity }] },
    { cache: "no-store", buyerIp }
  );

  return handleCartPayload(data.cartLinesUpdate, buyerIp, { existingCart: true });
}

export async function removeCartLine(
  cartId: string,
  lineId: string,
  buyerIp?: string | null
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesRemove: CartPayload }>(
    `
      mutation RemoveCartLine($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart { id }
          userErrors { code field message }
        }
      }
    `,
    { cartId, lineIds: [lineId] },
    { cache: "no-store", buyerIp }
  );

  return handleCartPayload(data.cartLinesRemove, buyerIp, { existingCart: true });
}
