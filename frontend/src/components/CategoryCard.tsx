import Link from "next/link";
import { getProductsByCategory } from "@/lib/data";
import type { Category } from "@/lib/types";

export default function CategoryCard({ category }: { category: Category }) {
  const count = getProductsByCategory(category.id).length;
  return (
    <Link
      href={`/shop?category=${category.id}`}
      className="cat-tile"
      style={{ "--accent": category.color } as React.CSSProperties}
    >
      <span className="cat-emoji" aria-hidden>{category.emoji}</span>
      <span className="cat-name">{category.name}</span>
      <span className="cat-count">{count} items</span>
    </Link>
  );
}
