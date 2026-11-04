"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

/** Horizontal scroll-snap row with previous/next buttons. */
export default function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="carousel" role="region" aria-label={label}>
      <button type="button" className="carousel-btn prev" onClick={() => scroll(-1)} aria-label="Scroll left">
        <ChevronLeftIcon />
      </button>
      <div className="carousel-track" ref={track}>
        {children}
      </div>
      <button type="button" className="carousel-btn next" onClick={() => scroll(1)} aria-label="Scroll right">
        <ChevronRightIcon />
      </button>
    </div>
  );
}
