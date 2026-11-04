"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CloseIcon, FilterIcon, GridIcon, ListIcon } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, getCategory, MAX_PRICE, PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import type { ProductTag } from "@/lib/types";

const SORTS = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  name: "Name A–Z",
} as const;
type SortKey = keyof typeof SORTS;

const TAGS: { value: ProductTag; label: string }[] = [
  { value: "sale", label: "🔥 On sale" },
  { value: "new", label: "✨ New" },
  { value: "bestseller", label: "⭐ Bestsellers" },
];

export default function ShopClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const sortParam = params.get("sort") ?? "featured";
  const sort: SortKey = sortParam in SORTS ? (sortParam as SortKey) : "featured";
  const inStockOnly = params.get("instock") === "1";

  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearAll = () => {
    setMaxPrice(MAX_PRICE);
    router.replace(pathname, { scroll: false });
  };

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = PRODUCTS.filter(
      (p) =>
        (!term || `${p.brand} ${p.name} ${p.description} ${getCategory(p.categoryId)?.name ?? ""}`.toLowerCase().includes(term)) &&
        (!category || p.categoryId === category) &&
        (!tag || p.tags.includes(tag as ProductTag)) &&
        (!inStockOnly || p.stock > 0) &&
        p.price <= maxPrice,
    );
    const sorted = [...list];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "rating": sorted.sort((a, b) => b.rating - a.rating); break;
      case "name": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return sorted;
  }, [q, category, tag, sort, inStockOnly, maxPrice]);

  const activeCat = getCategory(category);
  const activeTag = TAGS.find((t) => t.value === tag);
  const chips = [
    q && { key: "q", label: `“${q}”`, clear: () => update("q", "") },
    activeCat && { key: "category", label: activeCat.name, clear: () => update("category", "") },
    activeTag && { key: "tag", label: activeTag.label, clear: () => update("tag", "") },
    inStockOnly && { key: "instock", label: "In stock", clear: () => update("instock", "") },
    maxPrice < MAX_PRICE && { key: "price", label: `Under ${formatPrice(maxPrice)}`, clear: () => setMaxPrice(MAX_PRICE) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const countFor = (id: string) => PRODUCTS.filter((p) => p.categoryId === id).length;

  return (
    <>
      <div className="shop-banner" style={{ "--accent": activeCat?.color ?? "var(--primary)" } as React.CSSProperties}>
        <div>
          <span className="eyebrow">{activeCat ? "Department" : q ? "Search" : "Shop"}</span>
          <h1>{activeCat ? activeCat.name : q ? `Results for “${q}”` : "All products"}</h1>
          <p className="muted">
            {results.length} {results.length === 1 ? "product" : "products"} · prices in Ghana cedis
          </p>
        </div>
        <span className="shop-banner-emoji" aria-hidden>{activeCat?.emoji ?? "🛒"}</span>
      </div>

      {/* Mobile department chips */}
      <div className="dept-chips" role="group" aria-label="Departments">
        <button type="button" className={`chip ${!category ? "active" : ""}`} onClick={() => update("category", "")}>All</button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${category === c.id ? "active" : ""}`}
            onClick={() => update("category", c.id)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className="shop">
        <aside className={`shop-side ${filtersOpen ? "open" : ""}`} aria-label="Filters">
          <div className="side-block side-depts">
            <h3>Departments</h3>
            <ul>
              <li>
                <button type="button" className={!category ? "active" : ""} onClick={() => update("category", "")}>
                  <span>🛒 All products</span><span className="count">{PRODUCTS.length}</span>
                </button>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button type="button" className={category === c.id ? "active" : ""} onClick={() => update("category", c.id)}>
                    <span>{c.emoji} {c.name}</span><span className="count">{countFor(c.id)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="side-block">
            <h3>Max price</h3>
            <input
              type="range"
              className="range"
              min={5}
              max={MAX_PRICE}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Maximum price"
              style={{ "--fill": `${(maxPrice / MAX_PRICE) * 100}%` } as React.CSSProperties}
            />
            <div className="range-labels small muted">
              <span>{formatPrice(5)}</span>
              <strong>{maxPrice >= MAX_PRICE ? "Any price" : `Up to ${formatPrice(maxPrice)}`}</strong>
            </div>
          </div>

          <div className="side-block">
            <h3>Show</h3>
            <div className="tag-list">
              {TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`chip ${tag === t.value ? "active" : ""}`}
                  aria-pressed={tag === t.value}
                  onClick={() => update("tag", tag === t.value ? "" : t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="switch">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => update("instock", e.target.checked ? "1" : "")} />
              <span className="switch-track" aria-hidden><span /></span>
              In stock only
            </label>
          </div>
        </aside>

        <section className="shop-main">
          <div className="toolbar">
            <button type="button" className="btn btn-outline btn-sm filters-toggle" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
              <FilterIcon size={16} /> Filters
            </button>
            <div className="active-chips">
              {chips.map((c) => (
                <button key={c.key} type="button" className="chip chip-removable" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                  {c.label} <CloseIcon size={14} />
                </button>
              ))}
              {chips.length > 1 && (
                <button type="button" className="link-btn small" onClick={clearAll}>Clear all</button>
              )}
            </div>
            <div className="toolbar-right">
              <select className="input input-sm" value={sort} onChange={(e) => update("sort", e.target.value === "featured" ? "" : e.target.value)} aria-label="Sort by">
                {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <div className="segmented" role="group" aria-label="View">
                <button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view" aria-pressed={view === "grid"}>
                  <GridIcon size={18} />
                </button>
                <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"}>
                  <ListIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          {results.length > 0 ? (
            <div className={view === "grid" ? "product-grid" : "product-list"}>
              {results.map((p) => <ProductCard key={p.id} product={p} layout={view} />)}
            </div>
          ) : (
            <div className="empty card">
              <div className="empty-art" aria-hidden>🔍</div>
              <h3>Nothing matches those filters</h3>
              <p className="muted small">Try a different search or clear some filters.</p>
              <button type="button" className="btn btn-primary" onClick={clearAll}>Clear filters</button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
