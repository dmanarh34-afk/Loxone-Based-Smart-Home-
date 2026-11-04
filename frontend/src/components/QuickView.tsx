"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { discountPercent, getCategory, getProduct, getProductsByCategory } from "@/lib/data";
import { flyToCart } from "@/lib/fly";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { CheckIcon, CloseIcon, HeartIcon, MinusIcon, PlusIcon, StarIcon } from "./Icons";
import ProductImage from "./ProductImage";

export default function QuickView() {
  const { quickViewId, closeQuickView } = useCart();
  const product = quickViewId != null ? getProduct(quickViewId) : undefined;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  return (
    <dialog
      ref={ref}
      className="quickview"
      onClose={closeQuickView}
      onClick={(e) => e.target === e.currentTarget && closeQuickView()}
      aria-label={product?.name ?? "Product"}
    >
      {product && <QuickViewBody key={product.id} product={product} />}
    </dialog>
  );
}

function QuickViewBody({ product }: { product: Product }) {
  const { add, qtyOf, isSaved, toggleSaved, closeQuickView, openQuickView } = useCart();
  const [qty, setQty] = useState(1);
  const category = getCategory(product.categoryId);
  const inBasket = qtyOf(product.id);
  const maxAddable = Math.max(0, product.stock - inBasket);
  const off = discountPercent(product);
  const related = getProductsByCategory(product.categoryId)
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="qv" style={{ "--accent": category?.color } as React.CSSProperties}>
      <button type="button" className="icon-btn qv-close" onClick={closeQuickView} aria-label="Close">
        <CloseIcon />
      </button>

      <div className="qv-media">
        <span className="qv-photo">
          <ProductImage product={product} sizes="(max-width: 720px) 90vw, 420px" preload />
        </span>
        {off && <span className="badge-pill sale">−{off}%</span>}
      </div>

      <div className="qv-info">
        <span className="pcard-cat">{product.brand} · {category?.name}</span>
        <h2>{product.name}</h2>
        <div className="qv-rating">
          <span className="stars" aria-label={`Rated ${product.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon key={n} className={n <= Math.round(product.rating) ? "on" : ""} />
            ))}
          </span>
          <span className="muted small">{product.rating.toFixed(1)} · {product.unit}</span>
        </div>
        <div className="price price-lg">
          <span>{formatPrice(product.price)}</span>
          {product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}
        </div>
        <p className="muted">{product.description}</p>

        <p className={`qv-stock ${product.stock === 0 ? "out" : product.stock < 10 ? "low" : ""}`}>
          {product.stock === 0 ? "Out of stock" : product.stock < 10 ? `Hurry, only ${product.stock} left` : "✓ In stock"}
          {inBasket > 0 && <span className="muted"> · {inBasket} in your basket</span>}
        </p>

        <div className="qv-actions">
          <div className="stepper stepper-lg">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
              <MinusIcon size={16} />
            </button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(maxAddable, q + 1))} disabled={qty >= maxAddable} aria-label="Increase quantity">
              <PlusIcon size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary qv-add"
            disabled={maxAddable === 0}
            onClick={(e) => {
              flyToCart(e.currentTarget, product.image);
              add(product.id, Math.min(qty, maxAddable));
              setQty(1);
            }}
          >
            {maxAddable === 0 ? (product.stock === 0 ? "Sold out" : <><CheckIcon size={18} /> All in basket</>) : `Add ${qty} · ${formatPrice(product.price * qty)}`}
          </button>
          <button
            type="button"
            className={`icon-btn icon-btn-lg ${isSaved(product.id) ? "saved-on" : ""}`}
            onClick={() => toggleSaved(product.id)}
            aria-pressed={isSaved(product.id)}
            aria-label="Save for later"
          >
            <HeartIcon />
          </button>
        </div>

        {related.length > 0 && (
          <div className="qv-related">
            <h3 className="small">More in {category?.name}</h3>
            <div className="qv-related-list">
              {related.map((r) => (
                <button key={r.id} type="button" onClick={() => openQuickView(r.id)}>
                  <span className="thumb"><ProductImage product={r} sizes="64px" /></span>
                  <span>{r.brand} {r.name}</span>
                  <strong>{formatPrice(r.price)}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
