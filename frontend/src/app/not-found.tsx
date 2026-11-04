import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="container page">
      <div className="card empty">
        <div className="empty-art" aria-hidden>🧭</div>
        <h1>Page not found</h1>
        <p className="muted">We couldn&apos;t find that aisle.</p>
        <Link href="/" className="btn btn-primary">Back to home <ArrowRightIcon size={18} /></Link>
      </div>
    </div>
  );
}
