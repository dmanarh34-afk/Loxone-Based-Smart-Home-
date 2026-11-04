import type { Metadata } from "next";
import { ClockIcon, MapPinIcon, PhoneIcon, TruckIcon } from "@/components/Icons";
import { MALL } from "@/lib/data";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Visit" };

const FAQ = [
  { q: "How does pickup work?", a: "Order online, choose a time, and collect your bags at our counter. Most orders are ready within 60 minutes." },
  { q: "Where do you deliver?", a: `We deliver same-day across the city for a flat ${formatPrice(MALL.deliveryFee)}. Orders placed before 4 PM arrive the same day.` },
  { q: "How do I pay with Mobile Money?", a: "Choose Mobile Money at checkout, pick your network and enter your number. You'll get a prompt on your phone to approve the payment." },
  { q: "What if an item is out of stock?", a: "We'll call you to offer a similar replacement or refund the item. You only pay for what you get." },
  { q: "Can I return items?", a: "Unopened items can be returned within 30 days with your receipt." },
  { q: "Is there parking?", a: "Yes, there's free customer parking right outside the shop." },
];

export default function VisitPage() {
  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Come say hi</span>
        <h1>Visit {MALL.name}</h1>
        <p className="muted">Everything you need to know before you shop with us.</p>
      </div>

      <div className="visit-grid">
        <section className="card visit-card">
          <span className="visit-icon"><ClockIcon /></span>
          <h2>Opening hours</h2>
          <table className="hours">
            <tbody>
              {MALL.hours.map((h) => (
                <tr key={h.days}><th scope="row">{h.days}</th><td>{h.time}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Hours may change on public holidays.</p>
        </section>

        <section className="card visit-card">
          <span className="visit-icon"><MapPinIcon /></span>
          <h2>Find us</h2>
          <p>{MALL.address}</p>
          <div className="map-art" aria-hidden>
            <span className="map-pin">📍</span>
          </div>
        </section>

        <section className="card visit-card">
          <span className="visit-icon"><PhoneIcon /></span>
          <h2>Get in touch</h2>
          <p><a href={`tel:${MALL.phone.replace(/[^\d+]/g, "")}`}>{MALL.phone}</a></p>
          <p><a href={`mailto:${MALL.email}`}>{MALL.email}</a></p>
          <p className="muted small">We usually reply within an hour during opening times.</p>
        </section>

        <section className="card visit-card">
          <span className="visit-icon"><TruckIcon /></span>
          <h2>Delivery</h2>
          <p>Same-day delivery across the city for a flat {formatPrice(MALL.deliveryFee)}.</p>
          <p className="muted small">Order before 4 PM for same-day delivery.</p>
        </section>
      </div>

      <section className="section" id="faq">
        <div className="section-head"><h2>Frequently asked questions</h2></div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p className="muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
