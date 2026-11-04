"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRightIcon, CardIcon, CashIcon, CheckIcon, PhoneIcon, StoreIcon, TruckIcon } from "@/components/Icons";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { MALL } from "@/lib/data";
import { formatPrice } from "@/lib/format";

type Fulfilment = "pickup" | "delivery";
type Payment = "momo" | "card" | "cash";

interface Fields {
  name: string;
  phone: string;
  email: string;
  fulfilment: Fulfilment;
  slot: string;
  address: string;
  payment: Payment;
  momoNetwork: string;
  momoNumber: string;
  note: string;
}
type Errors = Partial<Record<keyof Fields, string>>;

const SLOTS = ["As soon as possible", "Today, 12 – 2 PM", "Today, 2 – 4 PM", "Today, 4 – 6 PM", "Tomorrow, 9 – 11 AM"];
const NETWORKS = ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"];

const isGhanaPhone = (v: string) => /^(\+233|0)\d{9}$/.test(v.replace(/[\s-]/g, ""));

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!isGhanaPhone(f.phone)) e.phone = "Enter a valid phone number, e.g. 024 123 4567.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Please enter a valid email.";
  if (f.fulfilment === "delivery" && f.address.trim().length < 5) e.address = "Please enter a delivery address.";
  if (f.payment === "momo" && !isGhanaPhone(f.momoNumber)) e.momoNumber = "Enter the Mobile Money number to charge.";
  return e;
}

export default function CheckoutClient() {
  const { lines, subtotal, fee, clear } = useCart();
  const [f, setF] = useState<Fields>({
    name: "", phone: "", email: "", fulfilment: "pickup", slot: SLOTS[0], address: "",
    payment: "momo", momoNetwork: NETWORKS[0], momoNumber: "", note: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<{ id: string; total: number; fields: Fields } | null>(null);

  const delivery = f.fulfilment === "delivery" ? MALL.deliveryFee : 0;
  const total = subtotal + fee + delivery;

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const found = validate(f);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    // TODO: replace with a POST to the backend, e.g. fetch("/api/orders", { method: "POST", body: ... })
    await new Promise((r) => setTimeout(r, 900));
    setOrder({ id: `DK-${Date.now().toString(36).toUpperCase().slice(-6)}`, total, fields: f });
    clear();
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (order) return <Confirmation order={order} />;

  if (lines.length === 0) {
    return (
      <div className="empty card">
        <div className="empty-art" aria-hidden>🧺</div>
        <h1>Your basket is empty</h1>
        <p className="muted">Add a few things before checking out.</p>
        <Link href="/shop" className="btn btn-primary">Start shopping <ArrowRightIcon size={18} /></Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">Almost there</span>
        <h1>Checkout</h1>
      </div>

      <form className="checkout" onSubmit={onSubmit} noValidate>
        <div className="checkout-steps">
          <Step n={1} title="Your details">
            <div className="field-grid">
              <Field label="Full name" error={errors.name}>
                <input className="input" name="name" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" placeholder="Ama Mensah" />
              </Field>
              <Field label="Phone number" error={errors.phone}>
                <input className="input" name="phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="024 123 4567" />
              </Field>
              <Field label="Email (optional)" error={errors.email} wide>
                <input className="input" name="email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="you@example.com" />
              </Field>
            </div>
          </Step>

          <Step n={2} title="Pickup or delivery">
            <div className="option-grid">
              <Option name="fulfilment" checked={f.fulfilment === "pickup"} onChange={() => set("fulfilment", "pickup")}
                icon={<StoreIcon />} title="Pickup" text="Collect at our counter · Free" />
              <Option name="fulfilment" checked={f.fulfilment === "delivery"} onChange={() => set("fulfilment", "delivery")}
                icon={<TruckIcon />} title="Delivery" text={`Same-day to your door · ${formatPrice(MALL.deliveryFee)}`} />
            </div>
            {f.fulfilment === "delivery" && (
              <Field label="Delivery address" error={errors.address}>
                <input className="input" name="address" value={f.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" placeholder="House number, street, area / landmark" />
              </Field>
            )}
            <div className="slot-list" role="radiogroup" aria-label={f.fulfilment === "pickup" ? "Pickup time" : "Delivery time"}>
              {SLOTS.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={f.slot === s} className={`chip ${f.slot === s ? "active" : ""}`} onClick={() => set("slot", s)}>
                  {s}
                </button>
              ))}
            </div>
          </Step>

          <Step n={3} title="Payment">
            <div className="option-grid option-grid-3">
              <Option name="payment" checked={f.payment === "momo"} onChange={() => set("payment", "momo")} icon={<PhoneIcon />} title="Mobile Money" text="MTN, Telecel, AirtelTigo" />
              <Option name="payment" checked={f.payment === "card"} onChange={() => set("payment", "card")} icon={<CardIcon />} title="Card" text={f.fulfilment === "pickup" ? "Pay at pickup" : "Pay on delivery"} />
              <Option name="payment" checked={f.payment === "cash"} onChange={() => set("payment", "cash")} icon={<CashIcon />} title="Cash" text={f.fulfilment === "pickup" ? "Pay at pickup" : "Pay on delivery"} />
            </div>
            {f.payment === "momo" && (
              <div className="field-grid">
                <Field label="Network">
                  <select className="input" name="momoNetwork" value={f.momoNetwork} onChange={(e) => set("momoNetwork", e.target.value)}>
                    {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="MoMo number" error={errors.momoNumber}>
                  <input className="input" name="momoNumber" type="tel" value={f.momoNumber} onChange={(e) => set("momoNumber", e.target.value)} placeholder="024 123 4567" />
                </Field>
              </div>
            )}
            <Field label="Order note (optional)">
              <textarea className="input" name="note" rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Please call when you arrive" />
            </Field>
          </Step>
        </div>

        <aside className="card summary">
          <h2>Order summary</h2>
          <ul className="summary-items">
            {lines.map(({ product, qty, lineTotal }) => (
              <li key={product.id}>
                <span className="thumb summary-thumb"><ProductImage product={product} sizes="48px" /><b>{qty}</b></span>
                <span className="summary-name">{product.brand} {product.name}<small>{product.unit}</small></span>
                <span>{formatPrice(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-totals">
            <div className="row"><span className="muted">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="row"><span className="muted">Service fee</span><span>{fee === 0 ? "Free" : formatPrice(fee)}</span></div>
            <div className="row"><span className="muted">Delivery</span><span>{delivery === 0 ? "Free" : formatPrice(delivery)}</span></div>
            <div className="row total"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? <><span className="spinner" aria-hidden /> Placing order…</> : <>Place order · {formatPrice(total)}</>}
          </button>
          <p className="muted small center">🔒 Your details are only used for this order.</p>
        </aside>
      </form>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="card step">
      <h2><span className="step-num">{n}</span>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`field ${error ? "has-error" : ""} ${wide ? "wide" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  );
}

function Option(props: { name: string; checked: boolean; onChange: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <label className={`option ${props.checked ? "checked" : ""}`}>
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onChange} />
      <span className="option-icon">{props.icon}</span>
      <span className="option-text"><strong>{props.title}</strong><small>{props.text}</small></span>
      <span className="option-check" aria-hidden><CheckIcon size={14} /></span>
    </label>
  );
}

function Confirmation({ order }: { order: { id: string; total: number; fields: Fields } }) {
  const { fields } = order;
  const steps = ["Order received", "Packing", fields.fulfilment === "pickup" ? "Ready for pickup" : "Out for delivery"];
  return (
    <div className="confirm card">
      <div className="confetti" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ "--i": i } as React.CSSProperties} />)}
      </div>
      <div className="confirm-check" aria-hidden><CheckIcon size={36} /></div>
      <h1>Thank you, {fields.name.split(" ")[0]}!</h1>
      <p className="muted">
        Order <strong>{order.id}</strong> · {formatPrice(order.total)} ·{" "}
        {fields.payment === "momo" ? `${fields.momoNetwork} prompt sent to ${fields.momoNumber}` : fields.payment === "card" ? "Pay by card" : "Pay with cash"}
      </p>

      <ol className="tracker">
        {steps.map((s, i) => (
          <li key={s} className={i === 0 ? "done" : ""}>
            <span className="tracker-dot">{i === 0 ? <CheckIcon size={14} /> : i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <p className="muted small">
        {fields.fulfilment === "pickup"
          ? `Pickup: ${fields.slot} at the ${MALL.name} counter, ${MALL.address}.`
          : `Delivery: ${fields.slot} to ${fields.address}.`}{" "}
        We&apos;ll text updates to {fields.phone}.
      </p>
      <Link href="/shop" className="btn btn-primary">Keep shopping <ArrowRightIcon size={18} /></Link>
    </div>
  );
}
