"use client";

import { useSyncExternalStore } from "react";

// Ticks once a second; the server renders a placeholder so hydration matches.
function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const getNow = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

export default function DealCountdown() {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);

  let parts = ["--", "--", "--"];
  if (now !== null) {
    const midnight = new Date(now * 1000);
    midnight.setHours(24, 0, 0, 0);
    const left = Math.max(0, Math.floor(midnight.getTime() / 1000) - now);
    parts = [pad(Math.floor(left / 3600)), pad(Math.floor((left % 3600) / 60)), pad(left % 60)];
  }

  return (
    <div className="countdown" aria-label="Time left on today's deals">
      <span className="muted small">Ends in</span>
      {parts.map((p, i) => (
        <span key={i} className="countdown-cell">
          <strong>{p}</strong>
          <small>{["h", "m", "s"][i]}</small>
        </span>
      ))}
    </div>
  );
}
