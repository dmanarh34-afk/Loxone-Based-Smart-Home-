// "Fly to cart" micro-animation: the product photo arcs from the clicked button to the cart icon.
export function flyToCart(from: HTMLElement, imageSrc: string) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = document.getElementById("cart-button");
  if (!target) return;

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const dx = b.left + b.width / 2 - x0;
  const dy = b.top + b.height / 2 - y0;

  const el = document.createElement("img");
  el.className = "fly";
  el.src = imageSrc;
  el.alt = "";
  el.style.left = `${x0}px`;
  el.style.top = `${y0}px`;
  document.body.appendChild(el);

  const anim = el.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 80}px)) scale(1.2)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0.4 },
    ],
    { duration: 700, easing: "cubic-bezier(.45,0,.55,1)" },
  );
  anim.onfinish = () => el.remove();
}
