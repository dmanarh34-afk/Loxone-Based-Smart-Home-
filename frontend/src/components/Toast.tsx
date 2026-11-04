"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { CheckIcon } from "./Icons";

export default function Toast() {
  const { toast, openCart } = useCart();
  // Keep showing the last message while the toast fades out.
  const [last, setLast] = useState(toast);
  if (toast && toast !== last) setLast(toast);
  const shown = toast ?? last;

  return (
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
      {shown && (
        <>
          <span className="toast-check" aria-hidden><CheckIcon size={14} /></span>
          <span>{shown.message}</span>
          {shown.withCartAction && (
            <button type="button" className="toast-action" onClick={openCart} tabIndex={toast ? 0 : -1}>
              View basket
            </button>
          )}
        </>
      )}
    </div>
  );
}
