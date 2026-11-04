// Ghana cedis, e.g. "GH₵1,234.50"
const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
});

export function formatPrice(value: number): string {
  return currency.format(value);
}
