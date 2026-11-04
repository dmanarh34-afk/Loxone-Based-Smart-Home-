import Image from "next/image";
import type { Product } from "@/lib/types";

/** Product photo that fills its (positioned, sized) parent and keeps the whole pack visible. */
export default function ProductImage({
  product,
  sizes = "240px",
  preload = false,
  className = "",
}: {
  product: Product;
  sizes?: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={product.image}
      alt={`${product.brand} ${product.name}, ${product.unit}`}
      fill
      sizes={sizes}
      preload={preload}
      className={`pimg ${className}`}
    />
  );
}
