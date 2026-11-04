"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { getCategory, PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { SearchIcon } from "./Icons";
import ProductImage from "./ProductImage";

export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { openQuickView } = useCart();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return PRODUCTS.filter(
      (p) =>
        `${p.brand} ${p.name}`.toLowerCase().includes(term) ||
        getCategory(p.categoryId)?.name.toLowerCase().includes(term),
    ).slice(0, 6);
  }, [query]);

  // Press "/" anywhere to jump to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pick = (id: number) => {
    openQuickView(id);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const submit = () => {
    const term = query.trim();
    setOpen(false);
    inputRef.current?.blur();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };

  const showList = open && query.trim().length > 0;

  return (
    <form
      className={`searchbox ${className}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && results[active]) pick(results[active].id);
        else submit();
      }}
    >
      <SearchIcon className="searchbox-icon" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search rice, Milo, Indomie…"
        aria-label="Search products"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
      />
      <kbd className="searchbox-kbd" aria-hidden>/</kbd>

      {showList && (
        <ul className="searchbox-list" id={listId} role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {results.length === 0 ? (
            <li className="searchbox-empty">No matches for “{query}”</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p.id)}
              >
                <span className="thumb searchbox-thumb"><ProductImage product={p} sizes="44px" /></span>
                <span className="searchbox-name">
                  {p.brand} {p.name}
                  <small>{p.unit}</small>
                </span>
                <strong>{formatPrice(p.price)}</strong>
              </li>
            ))
          )}
          <li className="searchbox-all" onClick={submit}>
            See all results for “{query.trim()}” →
          </li>
        </ul>
      )}
    </form>
  );
}
