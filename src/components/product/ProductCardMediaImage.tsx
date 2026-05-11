"use client";

import Image from "next/image";

/** Ảnh cover trong khung product-card__media — không skeleton (tránh shimmer vô hạn khi upstream ảnh lỗi). */
export function ProductCardMediaImage({
  src,
  sizes,
  priority = false,
}: {
  src: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      decoding="async"
      unoptimized
      style={{ objectFit: "cover", zIndex: 1 }}
    />
  );
}
