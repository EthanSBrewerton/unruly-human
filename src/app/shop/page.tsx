import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ShopHeader from "@/components/ShopHeader";
import { getShopProducts } from "@/lib/shopify";
import type { ShopifyMoney, ShopifyProduct } from "@/lib/shopify-types";
import { ALLOY_JACKET_PATH } from "@/lib/unruly-shop-contract";

export const metadata: Metadata = {
  title: "Shop | Unruly Human",
  description: "Artist-made shirts and the Alloy 000 bomber jacket by Unruly Human.",
};

function money(value: ShopifyMoney) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: value.currencyCode,
    minimumFractionDigits: 0,
  }).format(Number(value.amount));
}

function price(product: ShopifyProduct) {
  const min = money(product.priceRange.minVariantPrice);
  const max = money(product.priceRange.maxVariantPrice);
  return min === max ? min : `${min}–${max}`;
}

export default async function ShopPage() {
  const products = await getShopProducts();

  return (
    <main className="shop-shell">
      <ShopHeader />
      <section className="shop-hero">
        <p className="shop-kicker">UNRULY HUMAN / WEARABLE ART</p>
        <h1>ART THAT<br />REFUSES TO<br /><em>BEHAVE.</em></h1>
        <p className="shop-intro">
          Original biomechanical drawings translated into garments. Four shirts
          ship through Shopify. The limited Alloy 000 jacket keeps its own secure checkout.
        </p>
        <a href="#collection" className="shop-scroll">EXPLORE THE COLLECTION ↓</a>
      </section>

      <section id="collection" className="collection-section">
        <div className="collection-heading">
          <p>001 — SHOP ALL</p>
          <h2>THE COLLECTION</h2>
          <span>{products.length + 1} PIECES</span>
        </div>

        <div className="product-grid">
          <Link href={ALLOY_JACKET_PATH} className="product-card product-card-featured">
            <div className="product-image">
              <Image src="/images/hero_lifestyle.jpg" alt="Alloy 000 bomber jacket" fill sizes="(min-width: 900px) 66vw, 100vw" className="object-cover" priority />
              <span className="product-badge">LIMITED EDITION</span>
            </div>
            <div className="product-meta">
              <div><p>OUTERWEAR / 000</p><h3>ALLOY 000 BOMBER</h3></div>
              <strong>$300</strong>
            </div>
          </Link>

          {products.map((product, index) => (
            <Link href={`/shop/${product.handle}`} className="product-card" key={product.id}>
              <div className="product-image">
                {product.featuredImage ? (
                  <Image
                    src={product.featuredImage.url}
                    alt={product.featuredImage.altText ?? product.title}
                    width={product.featuredImage.width ?? 1000}
                    height={product.featuredImage.height ?? 1000}
                    sizes="(min-width: 900px) 33vw, 100vw"
                  />
                ) : <span className="product-missing">IMAGE FORTHCOMING</span>}
                {!product.availableForSale && <span className="product-badge">SOLD OUT</span>}
              </div>
              <div className="product-meta">
                <div><p>SHIRT / {String(index + 1).padStart(3, "0")}</p><h3>{product.title}</h3></div>
                <strong>{price(product)}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="shop-footer">
        <span>UNRULY HUMAN®</span><span>ART BY ETHAN S. BREWERTON</span><span>© 2026</span>
      </footer>
    </main>
  );
}
