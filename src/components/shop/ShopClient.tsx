"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  ShopifyCart,
  ShopifyCartLine,
  ShopifyMoney,
  ShopifyProduct,
  ShopifyProductVariant,
} from "@/lib/shopify-types";
import { MAX_CART_REQUEST_QUANTITY } from "@/lib/shopify-cart-policy";
import {
  findCompatibleVariantForOption,
  findInitialVariant,
  findSelectedVariant,
  isOptionValueAvailable,
  selectedOptionsMap,
} from "@/lib/shopify-variant-selection";

const CART_STORAGE_KEY = "unrulyhuman.shopifyCartId";

type CartResponse = {
  cart: ShopifyCart | null;
  code?: "INVALID_CART";
  error?: string;
};

type SelectionMap = Record<string, Record<string, string>>;

function formatMoney(money: ShopifyMoney) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

function formatPriceRange(product: ShopifyProduct) {
  const min = product.priceRange.minVariantPrice;
  const max = product.priceRange.maxVariantPrice;
  if (min.amount === max.amount && min.currencyCode === max.currencyCode) {
    return formatMoney(min);
  }
  return `${formatMoney(min)} - ${formatMoney(max)}`;
}

function initialSelections(
  products: ShopifyProduct[],
  initialVariantId?: string
): SelectionMap {
  return Object.fromEntries(
    products.map((product) => {
      const variant = findInitialVariant(product, initialVariantId);
      return [product.id, selectedOptionsMap(variant)];
    })
  );
}

class CartRequestError extends Error {
  code?: "INVALID_CART";

  constructor(message: string, code?: "INVALID_CART") {
    super(message);
    this.name = "CartRequestError";
    this.code = code;
  }
}

async function parseCartResponse(response: Response): Promise<CartResponse> {
  const json = (await response.json()) as CartResponse;
  if (!response.ok) {
    throw new CartRequestError(
      json.error ?? "Cart request failed.",
      json.code
    );
  }
  return json;
}

export default function ShopClient({
  products,
  view = "catalog",
  initialVariantId,
}: {
  products: ShopifyProduct[];
  view?: "catalog" | "detail";
  initialVariantId?: string;
}) {
  const [selections, setSelections] = useState<SelectionMap>(() =>
    initialSelections(products, initialVariantId)
  );
  const [gallerySelections, setGallerySelections] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      products.map((product) => {
        const initialVariant = findInitialVariant(product, initialVariantId);
        return [
          product.id,
          initialVariant?.image?.url ??
            product.featuredImage?.url ??
            product.images[0]?.url ??
            "",
        ];
      })
    )
  );
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const mutationLock = useRef(false);
  const mutationActive = pendingKey !== null;

  useEffect(() => {
    const storedCartId = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!storedCartId) return;

    const requestId = ++requestSequence.current;
    setCartId(storedCartId);
    setCartLoading(true);
    fetch("/api/shopify/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "restore", cartId: storedCartId }),
    })
      .then(parseCartResponse)
      .then((data) => {
        if (requestId !== requestSequence.current) return;
        if (data.code === "INVALID_CART" || !data.cart) {
          window.localStorage.removeItem(CART_STORAGE_KEY);
          setCartId(null);
          setCart(null);
          return;
        }
        setCart(data.cart);
      })
      .catch((error: unknown) => {
        if (requestId !== requestSequence.current) return;
        if (error instanceof CartRequestError && error.code === "INVALID_CART") {
          setCart(null);
          setCartId(null);
          window.localStorage.removeItem(CART_STORAGE_KEY);
          return;
        }
        setCartError(
          error instanceof Error ? error.message : "Unable to restore cart."
        );
      })
      .finally(() => {
        if (requestId === requestSequence.current) setCartLoading(false);
      });
  }, []);

  const productVariants = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [
          product.id,
          findSelectedVariant(product, selections[product.id] ?? {}),
        ])
      ) as Record<string, ShopifyProductVariant | undefined>,
    [products, selections]
  );

  function persistCart(nextCart: ShopifyCart) {
    setCart(nextCart);
    setCartId(nextCart.id);
    window.localStorage.setItem(CART_STORAGE_KEY, nextCart.id);
  }

  function applyCart(nextCart: ShopifyCart, requestId: number) {
    if (requestId !== requestSequence.current) return;
    persistCart(nextCart);
  }

  function clearCart() {
    setCart(null);
    setCartId(null);
    window.localStorage.removeItem(CART_STORAGE_KEY);
  }

  async function addToCart(product: ShopifyProduct) {
    if (mutationLock.current) return;
    const variant = productVariants[product.id];
    if (!variant || !variant.availableForSale) return;

    const requestId = ++requestSequence.current;
    mutationLock.current = true;
    setCartLoading(false);
    setPendingKey(variant.id);
    setCartError(null);

    const requestBody = {
      cartId,
      merchandiseId: variant.id,
      quantity: 1,
    };

    try {
      const response = await fetch("/api/shopify/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await parseCartResponse(response);
      if (data.cart) applyCart(data.cart, requestId);
    } catch (error) {
      if (
        cartId &&
        error instanceof CartRequestError &&
        error.code === "INVALID_CART" &&
        requestId === requestSequence.current
      ) {
        clearCart();
        try {
          const retry = await fetch("/api/shopify/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchandiseId: variant.id,
              quantity: 1,
            }),
          });
          const data = await parseCartResponse(retry);
          if (data.cart) applyCart(data.cart, requestId);
          return;
        } catch (retryError) {
          if (requestId !== requestSequence.current) return;
          setCartError(
            retryError instanceof Error
              ? retryError.message
              : "Unable to add item."
          );
          return;
        }
      }

      if (requestId !== requestSequence.current) return;
      setCartError(error instanceof Error ? error.message : "Unable to add item.");
    } finally {
      if (requestId === requestSequence.current) {
        mutationLock.current = false;
        setPendingKey(null);
      }
    }
  }

  async function mutateLine(
    line: ShopifyCartLine,
    nextQuantity: number,
    method: "PATCH" | "DELETE"
  ) {
    if (!cartId || mutationLock.current) return;
    const requestId = ++requestSequence.current;
    mutationLock.current = true;
    const key = `${method}:${line.id}`;
    setPendingKey(key);
    setCartError(null);

    try {
      const response = await fetch("/api/shopify/cart", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "DELETE"
            ? { cartId, lineId: line.id }
            : { cartId, lineId: line.id, quantity: nextQuantity }
        ),
      });
      const data = await parseCartResponse(response);
      if (data.cart) applyCart(data.cart, requestId);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      if (error instanceof CartRequestError && error.code === "INVALID_CART") {
        clearCart();
        return;
      }
      setCartError(
        error instanceof Error ? error.message : "Unable to update cart."
      );
    } finally {
      if (requestId === requestSequence.current) {
        mutationLock.current = false;
        setPendingKey(null);
      }
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section
        aria-label={view === "detail" ? "Product details" : "Products"}
        className={view === "detail" ? "grid gap-5" : "grid gap-5 lg:grid-cols-2"}
      >
        {products.map((product) => {
          const selectedVariant = productVariants[product.id];
          const selectedGalleryImage = product.images.find(
            (candidate) => candidate.url === gallerySelections[product.id]
          );
          const image =
            view === "detail"
              ? selectedGalleryImage ??
                selectedVariant?.image ??
                product.featuredImage ??
                product.images[0] ??
                null
              : product.featuredImage;
          const activeImageIndex = product.images.findIndex(
            (candidate) => candidate.url === image?.url
          );
          const purchasable =
            product.availableForSale && selectedVariant?.availableForSale;

          return (
            <article
              key={product.id}
              className="border border-white/10 bg-black/75 p-4 backdrop-blur-sm"
            >
              <div className="aspect-square overflow-hidden bg-white/[0.03]">
                {image ? (
                  view === "catalog" ? (
                    <Link
                      href={`/shop/${product.handle}`}
                      aria-label={`View ${product.title}`}
                      className="block h-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/70"
                    >
                      <Image
                        src={image.url}
                        alt={image.altText ?? product.title}
                        width={image.width ?? 900}
                        height={image.height ?? 900}
                        sizes="(min-width: 1280px) 420px, (min-width: 1024px) 45vw, 100vw"
                        className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                      />
                    </Link>
                  ) : (
                    <Image
                      src={image.url}
                      alt={
                        image.altText && image.altText !== "Product mockup"
                          ? image.altText
                          : `${product.title} view ${activeImageIndex >= 0 ? activeImageIndex + 1 : 1}`
                      }
                      width={image.width ?? 900}
                      height={image.height ?? 900}
                      sizes="(min-width: 1280px) 760px, 100vw"
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">
                    No image
                  </div>
                )}
              </div>

              {view === "detail" && product.images.length > 1 && (
                <>
                  <div
                    className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6"
                    role="group"
                    aria-label={`${product.title} image gallery`}
                  >
                    {product.images.map((galleryImage, index) => {
                      const active = galleryImage.url === image?.url;
                      return (
                        <button
                          key={galleryImage.url}
                          type="button"
                          aria-label={`View image ${index + 1} of ${product.images.length} for ${product.title}`}
                          aria-pressed={active}
                          className={`aspect-square overflow-hidden border bg-white/[0.03] transition focus:outline-none focus:ring-2 focus:ring-white/70 ${
                            active
                              ? "border-white"
                              : "border-white/15 opacity-65 hover:border-white/60 hover:opacity-100"
                          }`}
                          onClick={() =>
                            setGallerySelections((current) => ({
                              ...current,
                              [product.id]: galleryImage.url,
                            }))
                          }
                        >
                          <Image
                            src={galleryImage.url}
                            alt=""
                            width={galleryImage.width ?? 240}
                            height={galleryImage.height ?? 240}
                            sizes="120px"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="mt-2 text-xs uppercase tracking-[0.16em] text-white/40"
                    aria-live="polite"
                  >
                    View {activeImageIndex >= 0 ? activeImageIndex + 1 : 1} of{" "}
                    {product.images.length}
                  </p>
                </>
              )}

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  {view === "catalog" && (
                    <h2 className="text-lg font-semibold tracking-tight">
                      <Link
                        href={`/shop/${product.handle}`}
                        className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-white/70"
                      >
                        {product.title}
                      </Link>
                    </h2>
                  )}
                  <p className={view === "catalog" ? "mt-1 text-sm text-white/60" : "text-sm text-white/60"}>
                    {view === "detail" && selectedVariant
                      ? formatMoney(selectedVariant.price)
                      : formatPriceRange(product)}
                  </p>
                </div>
                {!purchasable && (
                  <span className="border border-white/20 px-2 py-1 text-xs uppercase tracking-wider text-white/50">
                    Sold out
                  </span>
                )}
              </div>

              {view === "detail" && product.descriptionHtml ? (
                <div
                  className="mt-4 text-sm leading-6 text-white/60 [&_a]:underline [&_a]:underline-offset-2 [&_div]:mt-3 [&_div]:overflow-x-auto [&_p]:mt-5 [&_strong]:font-semibold [&_strong]:text-white/80 [&_table]:w-full [&_table]:min-w-[360px] [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_tr:first-child_td]:bg-white/[0.04] [&_tr:first-child_td]:text-xs [&_tr:first-child_td]:uppercase [&_tr:first-child_td]:tracking-wider"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              ) : view === "detail" && product.description ? (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/60">
                  {product.description}
                </p>
              ) : null}

              {view === "detail" && product.options.length > 0 && (
                <div className="mt-4 space-y-3">
                  {product.options.map((option) => (
                    <fieldset key={option.id}>
                      <legend className="text-xs uppercase tracking-wider text-white/40">
                        {option.name}
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const active =
                            selections[product.id]?.[option.name] === value;
                          const disabled = !isOptionValueAvailable(
                            product,
                            option.name,
                            value
                          );
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={active}
                              disabled={disabled || mutationActive}
                              className={`border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-white/70 ${
                                active
                                  ? "border-white bg-white text-black"
                                  : disabled
                                    ? "cursor-not-allowed border-white/10 text-white/25"
                                  : "border-white/20 text-white/70 hover:border-white/60 hover:text-white"
                              }`}
                              onClick={() => {
                                const variant = findCompatibleVariantForOption(
                                  product,
                                  option.name,
                                  value
                                );
                                const variantImage = variant?.image;
                                setSelections((current) => ({
                                  ...current,
                                  [product.id]: selectedOptionsMap(variant),
                                }));
                                if (variantImage) {
                                  setGallerySelections((current) => ({
                                    ...current,
                                    [product.id]: variantImage.url,
                                  }));
                                }
                              }}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}

              {view === "detail" ? (
                <button
                  type="button"
                  className="mt-5 w-full border border-white px-4 py-3 text-sm uppercase tracking-wider transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/30 disabled:hover:bg-transparent"
                  disabled={!purchasable || mutationActive}
                  onClick={() => addToCart(product)}
                >
                  {pendingKey === selectedVariant?.id
                    ? "Adding..."
                    : purchasable
                      ? "Add to cart"
                      : "Unavailable"}
                </button>
              ) : (
                <Link
                  href={`/shop/${product.handle}`}
                  className="mt-5 block w-full border border-white px-4 py-3 text-center text-sm uppercase tracking-wider transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  View shirt
                </Link>
              )}
            </article>
          );
        })}
      </section>

      <aside
        aria-label="Cart"
        aria-busy={cartLoading || mutationActive}
        className="h-fit border border-white/10 bg-black/80 p-4 backdrop-blur-sm xl:sticky xl:top-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-white/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H6" />
            </svg>
            <span>Cart</span>
          </h2>
          {cart?.totalQuantity ? (
            <span className="text-sm text-white/50">
              {cart.totalQuantity} item{cart.totalQuantity === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div aria-live="polite" className="sr-only">
          {cartLoading
            ? "Loading cart."
            : mutationActive
              ? "Updating cart."
              : "Cart ready."}
        </div>

        {cartLoading && <p className="mt-4 text-sm text-white/50">Loading cart...</p>}
        {cartError && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {cartError}
          </p>
        )}

        {!cartLoading && (!cart || cart.lines.length === 0) && (
          <p className="mt-4 text-sm leading-6 text-white/50">
            Your cart is empty.
          </p>
        )}

        {cart && cart.lines.length > 0 && (
          <>
            <div className="mt-4 space-y-4">
              {cart.lines.map((line) => {
                const image =
                  line.merchandise.image ??
                  line.merchandise.product.featuredImage ??
                  null;
                return (
                  <div key={line.id} className="border-t border-white/10 pt-4">
                    <div className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden bg-white/[0.03]">
                        {image && (
                          <Image
                            src={image.url}
                            alt={
                              image.altText ??
                              line.merchandise.product.title
                            }
                            width={image.width ?? 160}
                            height={image.height ?? 160}
                            sizes="80px"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium">
                          {line.merchandise.product.title}
                        </h3>
                        {line.merchandise.title !== "Default Title" && (
                          <p className="mt-1 text-xs text-white/45">
                            {line.merchandise.title}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-white/45">
                          {formatMoney(line.cost.amountPerQuantity)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="h-8 px-2 text-xs uppercase tracking-wider text-white/45 transition hover:text-white disabled:opacity-40"
                        disabled={mutationActive}
                        onClick={() => mutateLine(line, 0, "DELETE")}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center border border-white/15">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${line.merchandise.product.title}`}
                          className="h-9 w-9 text-white/70 transition hover:bg-white hover:text-black disabled:opacity-30"
                          disabled={mutationActive || line.quantity <= 1}
                          onClick={() =>
                            mutateLine(line, line.quantity - 1, "PATCH")
                          }
                        >
                          -
                        </button>
                        <input
                          aria-label={`Quantity for ${line.merchandise.product.title}`}
                          type="number"
                          min={1}
                          max={MAX_CART_REQUEST_QUANTITY}
                          step={1}
                          className="h-9 w-12 bg-transparent text-center text-sm outline-none"
                          inputMode="numeric"
                          defaultValue={line.quantity}
                          key={`${line.id}:${line.quantity}`}
                          disabled={mutationActive}
                          onBlur={(event) => {
                            const value = Number(event.target.value);
                            if (
                              Number.isInteger(value) &&
                              value >= 1 &&
                              value <= MAX_CART_REQUEST_QUANTITY &&
                              value !== line.quantity
                            ) {
                              mutateLine(line, value, "PATCH");
                            } else {
                              event.target.value = String(line.quantity);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                        />
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${line.merchandise.product.title}`}
                          className="h-9 w-9 text-white/70 transition hover:bg-white hover:text-black disabled:opacity-30"
                          disabled={
                            mutationActive ||
                            line.quantity >= MAX_CART_REQUEST_QUANTITY
                          }
                          onClick={() =>
                            mutateLine(line, line.quantity + 1, "PATCH")
                          }
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm">{formatMoney(line.cost.subtotalAmount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex justify-between text-sm text-white/60">
                <span>Subtotal</span>
                <span>{formatMoney(cart.cost.subtotalAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(cart.cost.totalAmount)}</span>
              </div>
              <a
                href={cart.checkoutUrl}
                className="mt-5 block border border-white bg-white px-4 py-3 text-center text-sm uppercase tracking-wider text-black transition hover:bg-transparent hover:text-white"
              >
                Checkout
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
