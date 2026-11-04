"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { MALL, PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { ArrowRightIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "./Icons";
import ProductImage from "./ProductImage";

export default function CartDrawer() {
  const { lines, count, subtotal, fee, total, cartOpen, closeCart, setQty, remove, clear, add, qtyOf } = useCart();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen, closeCart]);

  const remaining = Math.max(0, MALL.freeServiceThreshold - subtotal);
  const progress = Math.min(100, (subtotal / MALL.freeServiceThreshold) * 100);
  const suggestions = PRODUCTS.filter((p) => p.tags.includes("bestseller") && p.stock > 0 && qtyOf(p.id) === 0).slice(0, 4);

  return (
    <>
      <div className={`overlay ${cartOpen ? "show" : ""}`} onClick={closeCart} aria-hidden />
      <aside className={`drawer ${cartOpen ? "open" : ""}`} aria-label="Basket" aria-hidden={!cartOpen} inert={!cartOpen}>
        <div className="drawer-head">
          <div>
            <h2>Your basket</h2>
            <p className="muted small">{count} {count === 1 ? "item" : "items"}</p>
          </div>
          <button type="button" className="icon-btn" onClick={closeCart} aria-label="Close basket">
            <CloseIcon />
          </button>
        </div>

        {lines.length > 0 && (
          <div className="progress-box">
            <p className="small">
              {remaining > 0 ? (
                <>Add <strong>{formatPrice(remaining)}</strong> more to skip the service fee</>
              ) : (
                <>🎉 You&apos;ve unlocked <strong>no service fee</strong></>
              )}
            </p>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="empty">
              <div className="empty-art" aria-hidden>🧺</div>
              <h3>Your basket is empty</h3>
              <p className="muted small">Fill it up with groceries and everyday essentials.</p>
              <Link href="/shop" className="btn btn-primary" onClick={closeCart}>
                Start shopping <ArrowRightIcon size={18} />
              </Link>
            </div>
          ) : (
            <>
              <ul className="cart-list">
                {lines.map(({ product, qty, lineTotal }) => (
                  <li key={product.id} className="cart-line">
                    <span className="thumb cart-thumb"><ProductImage product={product} sizes="64px" /></span>
                    <div className="cart-line-info">
                      <strong>{product.brand} {product.name}</strong>
                      <span className="muted small">{product.unit} · {formatPrice(product.price)}</span>
                      <div className="stepper stepper-sm">
                        <button type="button" onClick={() => setQty(product.id, qty - 1)} aria-label={`Remove one ${product.name}`}>
                          <MinusIcon size={14} />
                        </button>
                        <span aria-live="polite">{qty}</span>
                        <button type="button" onClick={() => setQty(product.id, qty + 1)} disabled={qty >= product.stock} aria-label={`Add one ${product.name}`}>
                          <PlusIcon size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="cart-line-end">
                      <strong>{formatPrice(lineTotal)}</strong>
                      <button type="button" className="ghost-icon" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="link-btn small clear-link" onClick={clear}>Clear basket</button>
            </>
          )}

          {suggestions.length > 0 && (
            <div className="suggest">
              <h3 className="small">Popular right now</h3>
              <div className="suggest-list">
                {suggestions.map((p) => (
                  <div key={p.id} className="suggest-item">
                    <span className="thumb suggest-thumb"><ProductImage product={p} sizes="56px" /></span>
                    <span className="suggest-name">{p.brand} {p.name}</span>
                    <span className="small">{formatPrice(p.price)}</span>
                    <button type="button" className="suggest-add" onClick={() => add(p.id)} aria-label={`Add ${p.name}`}>
                      <PlusIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="row"><span className="muted">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="row"><span className="muted">Service fee</span><span>{fee === 0 ? "Free" : formatPrice(fee)}</span></div>
            <div className="row total"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Link href="/checkout" className="btn btn-primary btn-block btn-lg" onClick={closeCart}>
              Checkout <ArrowRightIcon size={18} />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
