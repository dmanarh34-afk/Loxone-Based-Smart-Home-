 import type { Metadata } from "next";
import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <div className="container page">
      <Suspense fallback={<div className="product-grid skeleton-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}</div>}>
        <ShopClient />
      </Suspense>
    </div>
  );
}
