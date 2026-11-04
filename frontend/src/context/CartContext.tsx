"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cartStore, savedStore } from "@/lib/cartStore";
import { getProduct, MALL } from "@/lib/data";
import type { Product } from "@/lib/types";

export interface CartLine {
  product: Product;
  qty: number;
  lineTotal: number;
}

export interface ToastState {
  id: number;
  message: string;
  withCartAction: boolean;
}

interface ShopContextValue {
  // cart
  lines: CartLine[];
  count: number;
  subtotal: number;
  fee: number;
  total: number;
  qtyOf: (productId: number) => number;
  add: (productId: number, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  bump: number;
  // saved items
  saved: number[];
  isSaved: (productId: number) => boolean;
  toggleSaved: (productId: number) => void;
  // UI
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  quickViewId: number | null;
  openQuickView: (productId: number) => void;
  closeQuickView: () => void;
  toast: ToastState | null;
  showToast: (message: string, withCartAction?: boolean) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickViewId, setQuickViewId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [bump, setBump] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, withCartAction = false) => {
    setToast({ id: Date.now(), message, withCartAction });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    const product = getProduct(productId);
    if (!product) return;
    const clamped = Math.max(0, Math.min(qty, product.stock));
    const current = cartStore.getSnapshot();
    const exists = current.some((i) => i.productId === productId);
    const next =
      clamped === 0
        ? current.filter((i) => i.productId !== productId)
        : exists
          ? current.map((i) => (i.productId === productId ? { ...i, qty: clamped } : i))
          : [...current, { productId, qty: clamped }];
    cartStore.set(next);
  }, []);

  const add = useCallback(
    (productId: number, qty = 1) => {
      const product = getProduct(productId);
      if (!product || product.stock === 0) return;
      const currentQty = cartStore.getSnapshot().find((i) => i.productId === productId)?.qty ?? 0;
      if (currentQty >= product.stock) {
        showToast(`Only ${product.stock} ${product.name} in stock`);
        return;
      }
      setQty(productId, currentQty + qty);
      setBump((b) => b + 1);
      showToast(`${product.name} added to your basket`, true);
    },
    [setQty, showToast],
  );

  const toggleSaved = useCallback(
    (productId: number) => {
      const current = savedStore.getSnapshot();
      const product = getProduct(productId);
      if (current.includes(productId)) {
        savedStore.set(current.filter((id) => id !== productId));
        showToast(`Removed ${product?.name ?? "item"} from saved`);
      } else {
        savedStore.set([...current, productId]);
        showToast(`Saved ${product?.name ?? "item"} for later`);
      }
    },
    [showToast],
  );

  const value = useMemo<ShopContextValue>(() => {
    const lines: CartLine[] = items.flatMap((i) => {
      const product = getProduct(i.productId);
      return product ? [{ product, qty: i.qty, lineTotal: product.price * i.qty }] : [];
    });
    const qtyMap = new Map(items.map((i) => [i.productId, i.qty]));
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const fee =
      subtotal === 0 || subtotal >= MALL.freeServiceThreshold
        ? 0
        : Math.round(subtotal * MALL.serviceFeeRate * 100) / 100;
    const savedSet = new Set(saved);

    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      subtotal,
      fee,
      total: subtotal + fee,
      qtyOf: (id) => qtyMap.get(id) ?? 0,
      add,
      setQty,
      remove: (id) => setQty(id, 0),
      clear: () => cartStore.set([]),
      bump,
      saved,
      isSaved: (id) => savedSet.has(id),
      toggleSaved,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      quickViewId,
      openQuickView: (id) => setQuickViewId(id),
      closeQuickView: () => setQuickViewId(null),
      toast,
      showToast,
    };
  }, [items, saved, add, setQty, bump, toggleSaved, cartOpen, quickViewId, toast, showToast]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useCart(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
