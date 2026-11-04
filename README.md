# DOTKAD MINI MALL — Frontend

Next.js (App Router) + React + TypeScript storefront for DOTKAD MINI MALL, a single shop with six departments. Prices are in Ghana cedis (GH₵).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production
```

## Pages

| Route           | What it does                                                        |
| --------------- | ------------------------------------------------------------------- |
| `/`             | Hero, departments, bestsellers, deals, events                       |
| `/shop`         | All products: search, department filter (`?category=`), tag chips, sort, in-stock toggle (state lives in the URL) |
| `/checkout`     | Validated pickup/checkout form, order summary, confirmation         |
| `/visit`        | Hours, location, transport, FAQ                                     |

The cart is a slide-out drawer that is available on every page. It is stored in `localStorage`, and multiple tabs stay in sync.

## Structure

```
src/
  app/            routes (see table above), globals.css
  components/     Header, Footer, ProductCard, CategoryCard, CartDrawer, Toast
  context/        CartContext (cart state, drawer + toast UI state)
  lib/
    data.ts       shop info, departments, products, events + helpers  ← swap for API calls
    cartStore.ts  localStorage-backed cart store (useSyncExternalStore)
    types.ts      shared TypeScript types
    format.ts     currency formatting
```

## Connecting the backend

- Replace the arrays and helpers in `src/lib/data.ts` with `fetch` calls to your API.
- Replace the simulated submit in `src/app/checkout/CheckoutClient.tsx` (marked `TODO`) with a `POST /api/orders`.
