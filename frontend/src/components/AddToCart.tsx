"use client";

import { useCart } from "@/context/CartContext";
import { flyToCart } from "@/lib/fly";
import type { Product } from "@/lib/types";
import { MinusIcon, PlusIcon } from "./Icons";

/** "Add" button that turns into a − qty + stepper once the item is in the basket. */
export default function AddToCart({ product }: { product: Product }) {
  const { qtyOf, add, setQty } = useCart();
  const qty = qtyOf(product.id);

  if (product.stock === 0) {
    return <span className="soldout-pill">Sold out</span>;
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        className="add-btn"
        onClick={(e) => {
          flyToCart(e.currentTarget, product.image);
          add(product.id);
        }}
        aria-label={`Add ${product.name} to basket`}
      >
        <PlusIcon size={18} />
        <span>Add</span>
      </button>
    );
  }

  return (
    <div className="stepper" role="group" aria-label={`${product.name} quantity`}>
      <button type="button" onClick={() => setQty(product.id, qty - 1)} aria-label={`Remove one ${product.name}`}>
        <MinusIcon size={16} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button
        type="button"
        onClick={(e) => {
          flyToCart(e.currentTarget, product.image);
          add(product.id);
        }}
        disabled={qty >= product.stock}
        aria-label={`Add one more ${product.name}`}
      >
        <PlusIcon size={16} />
      </button>
    </div>
  );
}
