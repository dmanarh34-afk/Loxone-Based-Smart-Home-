// Small localStorage-backed stores, read by components through useSyncExternalStore.
import type { CartItem } from "./types";

function createLocalStore<T>(key: string, initial: T, parse: (raw: unknown) => T) {
  let value = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      value = raw ? parse(JSON.parse(raw)) : initial;
    } catch {
      value = initial;
    }
  };
  const emit = () => listeners.forEach((l) => l());

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        loaded = false;
        load();
        emit();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot(): T {
      load();
      return value;
    },
    getServerSnapshot(): T {
      return initial;
    },
    set(next: T) {
      value = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode etc.) — keep in memory only.
      }
      emit();
    },
  };
}

const EMPTY_CART: CartItem[] = [];
const EMPTY_IDS: number[] = [];

export const cartStore = createLocalStore<CartItem[]>("dotkad-cart-v2", EMPTY_CART, (raw) =>
  Array.isArray(raw)
    ? raw.filter(
        (i): i is CartItem =>
          typeof i?.productId === "number" && typeof i?.qty === "number" && i.qty > 0,
      )
    : EMPTY_CART,
);

export const savedStore = createLocalStore<number[]>("dotkad-saved-v2", EMPTY_IDS, (raw) =>
  Array.isArray(raw) ? raw.filter((n): n is number => typeof n === "number") : EMPTY_IDS,
);
