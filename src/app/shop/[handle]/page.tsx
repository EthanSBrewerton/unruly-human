import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShopHeader from "@/components/ShopHeader";
import ShopClient from "@/components/shop/ShopClient";
import { getShopProduct } from "@/lib/shopify";
import { isUnrulyShirt } from "@/lib/unruly-shop-contract";

interface Props {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{ variant?: string | string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getShopProduct((await params).handle);
  if (!product || !isUnrulyShirt(product)) return { title: "Product not found" };
  return {
    title: `${product.title} | Unruly Human`,
    description: product.description,
    openGraph: { images: product.featuredImage ? [product.featuredImage.url] : [] },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const requestedVariant = (await searchParams)?.variant;
  const initialVariantId = Array.isArray(requestedVariant) ? requestedVariant[0] : requestedVariant;
  const product = await getShopProduct(handle);
  if (!product || !isUnrulyShirt(product)) notFound();

  return (
    <main className="shop-shell product-page-shell">
      <ShopHeader />
      <div className="product-page-heading">
        <Link href="/shop">← ALL PIECES</Link>
        <p>SHOPIFY APPAREL / LIVE AVAILABILITY</p>
        <h1>{product.title}</h1>
      </div>
      <div className="product-client-wrap">
        <ShopClient products={[product]} view="detail" initialVariantId={initialVariantId} />
      </div>
      <aside className="checkout-separation">
        <strong>SEPARATE CHECKOUTS, BY DESIGN.</strong>
        <span>Shirts check out securely with Shopify. Alloy 000 remains a separate Stripe purchase and cannot share this cart.</span>
      </aside>
    </main>
  );
}
