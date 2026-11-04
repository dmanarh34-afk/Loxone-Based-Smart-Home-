"use client";

import { MoonIcon, SunIcon } from "./Icons";

// Toggles <html data-theme>. Both icons are rendered; CSS shows the right one,
// so server and client markup always match.
export default function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("dotkad-theme", next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label="Toggle dark mode">
      <SunIcon className="icon-sun" />
      <MoonIcon className="icon-moon" />
    </button>
  );
}
