import { Shirt } from "lucide-react";
import type { Product } from "@/lib/types";
import "./product-image.css";

export function ProductImage({
  product,
  size,
}: {
  product: Product;
  size: "tile" | "thumb";
}) {
  const image = product.cover || product.sketch;
  return (
    <span className={`product-image product-image-${size}`}>
      {image ? (
        <img src={image} alt="" />
      ) : (
        <>
          <Shirt size={size === "tile" ? 40 : 24} aria-hidden="true" />
          {size === "tile" && <span>{product.category}</span>}
        </>
      )}
    </span>
  );
}
