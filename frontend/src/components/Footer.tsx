import Link from "next/link";
import { CATEGORIES, MALL } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link href="/" className="logo">
            <span className="logo-mark" aria-hidden>D</span>
            <span className="logo-text">{MALL.name}</span>
          </Link>
          <p className="muted">{MALL.tagline}. Trusted brands, friendly prices every day.</p>
          <div className="pay-badges" aria-label="Payment methods">
            <span>📱 Mobile Money</span>
            <span>💳 Card</span>
            <span>💵 Cash</span>
          </div>
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.id}><Link href={`/shop?category=${c.id}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><Link href="/visit">Opening hours</Link></li>
            <li><Link href="/visit#faq">Delivery & pickup</Link></li>
            <li><Link href="/visit#faq">Returns</Link></li>
            <li><Link href="/saved">Saved items</Link></li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul className="muted">
            <li>{MALL.address}</li>
            <li>{MALL.phone}</li>
            <li>{MALL.email}</li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom muted">
        <span>© {MALL.name}. All rights reserved.</span>
        <span>
          Product photos from{" "}
          <a href="https://openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>, licensed{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>.
        </span>
      </div>
    </footer>
  );
}
