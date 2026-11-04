export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export type ProductTag = "new" | "sale" | "bestseller";

export interface Product {
  id: number;
  categoryId: string;
  brand: string;
  name: string;
  unit: string;
  description: string;
  price: number;
  oldPrice?: number;
  /** Path under /public, e.g. /products/6033000088031.jpg */
  image: string;
  rating: number;
  stock: number;
  tags: ProductTag[];
}

export interface CartItem {
  productId: number;
  qty: number;
}
