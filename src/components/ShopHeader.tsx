import Link from "next/link";
import Image from "next/image";

export default function ShopHeader() {
  return (
    <header className="shop-header">
      <Link href="/" className="shop-wordmark" aria-label="Unruly Human home">
        <Image src="/images/logo-white.png" alt="" width={28} height={34} priority />
        <span>UNRULY HUMAN</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/shop">SHOP</Link>
        <Link href="/products/alloy-000">ALLOY 000</Link>
      </nav>
    </header>
  );
}
