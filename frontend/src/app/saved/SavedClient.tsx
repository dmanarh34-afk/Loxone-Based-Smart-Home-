"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { getProduct } from "@/lib/data";

export default function SavedClient() {
  const { saved, add, qtyOf } = useCart();
  const products = saved.flatMap((id) => getProduct(id) ?? []);
  const addable = products.filter((p) => p.stock > 0 && qtyOf(p.id) === 0);

  return (
    <>
      <div className="page-head page-head-row">
        <div>
          <span className="eyebrow">Your list</span>
          <h1>Saved items</h1>
          <p className="muted">{products.length} {products.length === 1 ? "item" : "items"} saved for later</p>
        </div>
        {addable.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => addable.forEach((p) => add(p.id))}>
            Add all to basket
          </button>
        )}
      </div>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="empty card">
          <div className="empty-art" aria-hidden>💚</div>
          <h3>Nothing saved yet</h3>
          <p className="muted small">Tap the heart on any product to keep it here.</p>
          <Link href="/shop" className="btn btn-primary">Browse products <ArrowRightIcon size={18} /></Link>
        </div>
      )}
    </>
  );
}
