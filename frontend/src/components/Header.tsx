"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { MALL } from "@/lib/data";
import { BagIcon, HeartIcon, MenuIcon } from "./Icons";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/visit", label: "Visit" },
];

export default function Header() {
  const pathname = usePathname();
  const { count, saved, openCart, bump } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="topbar">
      <div className="announce">
        <span>🚚 Same-day delivery · 🛍️ Pickup ready in 60 minutes · 📱 Pay with Mobile Money</span>
      </div>
      <div className="container topbar-inner">
        <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark" aria-hidden>D</span>
          <span className="logo-text">{MALL.name}</span>
        </Link>

        <nav className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : undefined}
              aria-current={isActive(l.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <SearchBox className="header-search" />

        <div className="topbar-actions">
          <ThemeToggle />
          <Link href="/saved" className="icon-btn has-badge" aria-label={`Saved items, ${saved.length}`}>
            <HeartIcon />
            {saved.length > 0 && <span className="badge">{saved.length}</span>}
          </Link>
          <button
            type="button"
            id="cart-button"
            className="cart-btn"
            onClick={openCart}
            aria-label={`Open basket, ${count} items`}
          >
            <BagIcon />
            <span className="cart-label">Basket</span>
            <span key={bump} className={`cart-count ${bump ? "bump" : ""}`}>{count}</span>
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
