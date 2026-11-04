import Link from "next/link";
import Carousel from "@/components/Carousel";
import CategoryCard from "@/components/CategoryCard";
import DealCountdown from "@/components/DealCountdown";
import { ArrowRightIcon, ClockIcon, PhoneIcon, ShieldIcon, StarIcon, TagIcon, TruckIcon } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import SearchBox from "@/components/SearchBox";
import { CATEGORIES, getProductsByCategory, MALL, PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/format";

const POPULAR = ["Rice", "Indomie", "Milo", "Perfume", "Lotion", "Malta"];

const FEATURES = [
  { icon: TagIcon, title: "Brands you trust", text: "Gino, Frytol, Peak, Milo & more" },
  { icon: ClockIcon, title: "Pickup in 60 min", text: "Order now, collect at our counter" },
  { icon: TruckIcon, title: "Same-day delivery", text: `Flat ${formatPrice(MALL.deliveryFee)} across the city` },
  { icon: PhoneIcon, title: "Pay with MoMo", text: "Mobile Money, card or cash" },
];

// Barcodes of the packs shown floating in the hero: the cleanest, most colourful studio shots in the catalogue.
const HERO_IDS = ["8720039305618", "0051500255162", "3414202011752", "0021000658831", "0667556605051", "8720168306500"];

export default function HomePage() {
  const heroProducts = HERO_IDS.flatMap((code) => PRODUCTS.find((p) => p.image.includes(code)) ?? []);
  const deals = PRODUCTS.filter((p) => p.oldPrice);
  const bestsellers = PRODUCTS.filter((p) => p.tags.includes("bestseller"));
  const breakfast = getProductsByCategory("breakfast").slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <span className="chip-live"><span className="dot" /> Open today · Pickup in 60 min</span>
            <h1>
              Your everyday <span className="grad">supermarket</span>, now online.
            </h1>
            <p className="lead lead-strong">
              Rice, oil, drinks, snacks, lotions, perfumes and toiletries from <span className="brand-green">{MALL.name}</span>. Order in minutes,
              then pick up or get it delivered today.
            </p>
            <SearchBox className="hero-search" />
            <div className="popular">
              <span className="muted small">Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p} href={`/shop?q=${encodeURIComponent(p)}`} className="chip">{p}</Link>
              ))}
            </div>
          </div>

          <div className="hero-art" aria-hidden>
            <div className="hero-blob" />
            <div className="hero-packs">
              {heroProducts.map((p, i) => (
                <span key={p.id} className="hero-pack" style={{ "--i": i } as React.CSSProperties}>
                  <ProductImage product={p} sizes="160px" preload={i < 2} />
                </span>
              ))}
            </div>
            <div className="hero-card hero-card-a">
              <span className="hero-card-icon">🛍️</span>
              <div><strong>Ready in 60 min</strong><small>Pickup at our counter</small></div>
            </div>
            <div className="hero-card hero-card-b">
              <span className="hero-card-stars"><StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon /></span>
              <div><strong>4.8 / 5</strong><small>from happy shoppers</small></div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Features */}
        <section className="features reveal">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="feature">
              <span className="feature-icon"><Icon /></span>
              <div>
                <strong>{title}</strong>
                <p className="muted small">{text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Departments */}
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">Browse</span>
              <h2>Shop by aisle</h2>
            </div>
            <Link href="/shop" className="see-all">View all <ArrowRightIcon size={16} /></Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} />)}
          </div>
        </section>

        {/* Deals */}
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow eyebrow-hot">🔥 Today only</span>
              <h2>Daily deals</h2>
            </div>
            <DealCountdown />
          </div>
          <Carousel label="Daily deals">
            {deals.map((p) => <ProductCard key={p.id} product={p} />)}
          </Carousel>
        </section>

        {/* Promo banners */}
        <section className="section promos reveal">
          <div className="promo promo-green">
            <div>
              <span className="eyebrow eyebrow-light">Kitchen staples</span>
              <h2>Stock up your kitchen</h2>
              <p>Rice, oil, tomato paste and seasoning, everything for jollof night.</p>
              <Link href="/shop?category=cooking" className="btn btn-light">Shop essentials <ArrowRightIcon size={18} /></Link>
            </div>
            <span className="promo-art" aria-hidden>🍲</span>
          </div>
          <div className="promo promo-orange">
            <div>
              <span className="eyebrow eyebrow-light">Save more</span>
              <h2>No service fee over {formatPrice(MALL.freeServiceThreshold)}</h2>
              <p>Fill your basket for the month and skip the fee.</p>
              <Link href="/shop?category=grains" className="btn btn-light">Shop rice & grains <ArrowRightIcon size={18} /></Link>
            </div>
            <span className="promo-art" aria-hidden>🧺</span>
          </div>
        </section>

        {/* Bestsellers */}
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">Customer favourites</span>
              <h2>Bestsellers</h2>
            </div>
            <Link href="/shop?tag=bestseller" className="see-all">See all <ArrowRightIcon size={16} /></Link>
          </div>
          <Carousel label="Bestsellers">
            {bestsellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </Carousel>
        </section>

        {/* Breakfast */}
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">Rise & shine</span>
              <h2>Breakfast table</h2>
            </div>
            <Link href="/shop?category=breakfast" className="see-all">See all <ArrowRightIcon size={16} /></Link>
          </div>
          <div className="product-grid">
            {breakfast.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Trust */}
        <section className="section trust reveal">
          <ShieldIcon size={28} />
          <div>
            <h2>Quality guaranteed</h2>
            <p className="muted">Every pack is checked for its expiry date. Not happy? Bring it back within 30 days with your receipt.</p>
          </div>
          <Link href="/visit" className="btn btn-outline">Visit the shop</Link>
        </section>
      </div>
    </>
  );
}
