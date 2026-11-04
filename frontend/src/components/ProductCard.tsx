"use client";

import { useCart } from "@/context/CartContext";
import { discountPercent, getCategory } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import AddToCart from "./AddToCart";
import { HeartIcon, StarIcon } from "./Icons";
import ProductImage from "./ProductImage";

export default function ProductCard({ product, layout = "grid" }: { product: Product; layout?: "grid" | "list" }) {
  const { openQuickView, isSaved, toggleSaved } = useCart();
  const category = getCategory(product.categoryId);
  const off = discountPercent(product);
  const saved = isSaved(product.id);

  return (
    <article
      className={`pcard ${layout === "list" ? "pcard-list" : ""} ${product.stock === 0 ? "is-soldout" : ""}`}
      style={{ "--accent": category?.color } as React.CSSProperties}
    >
      <button
        type="button"
        className="pcard-media"
        onClick={() => openQuickView(product.id)}
        aria-label={`Quick view ${product.brand} ${product.name}`}
      >
        <span className="pcard-photo">
          <ProductImage product={product} sizes={layout === "list" ? "180px" : "(max-width: 520px) 50vw, 260px"} />
        </span>
        <span className="pcard-badges">
          {off && <span className="badge-pill sale">−{off}%</span>}
          {product.tags.includes("new") && <span className="badge-pill new">New</span>}
          {product.tags.includes("bestseller") && <span className="badge-pill best">Bestseller</span>}
        </span>
        <span className="pcard-quick" aria-hidden>Quick view</span>
      </button>

      <button
        type="button"
        className={`pcard-save ${saved ? "on" : ""}`}
        onClick={() => toggleSaved(product.id)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      >
        <HeartIcon size={18} />
      </button>

      <div className="pcard-body">
        <div className="pcard-meta">
          <span className="pcard-cat">{product.brand}</span>
          <span className="pcard-rating"><StarIcon /> {product.rating.toFixed(1)}</span>
        </div>
        <h3 className="pcard-title">
          <button type="button" onClick={() => openQuickView(product.id)}>{product.name}</button>
        </h3>
        <p className="pcard-unit">{product.unit}</p>
        {layout === "list" && <p className="muted small">{product.description}</p>}
        {product.stock > 0 && product.stock < 10 && (
          <p className="pcard-low">Only {product.stock} left</p>
        )}
        <div className="pcard-foot">
          <div className="price">
            <span>{formatPrice(product.price)}</span>
            {product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}
          </div>
          <AddToCart product={product} />
        </div>
      </div>
    </article>
  );
}
