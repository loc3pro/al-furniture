"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

type Props = {
  previewUrl: string;
  imgClassName: string;
  fallbackClassName: string;
};

/** Preview blob URL — fallback icon khi trình duyệt không decode (vd. HEIC). */
export function PendingImageThumb({ previewUrl, imgClassName, fallbackClassName }: Props) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <ImageIcon className={fallbackClassName} size={22} strokeWidth={2} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob preview
    <img src={previewUrl} alt="" className={imgClassName} onError={() => setBroken(true)} />
  );
}
