/** Ảnh https từ JSON imageUrls của các biến thể — thứ tự duyệt biến thể, không trùng URL. */
export function collectVariantGalleryUrls(variants: { imageUrls: unknown }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const raw = v.imageUrls;
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const s = item.trim();
      if (!s) continue;
      try {
        const u = new URL(s);
        if (u.protocol !== "https:") continue;
        const href = u.href;
        if (seen.has(href)) continue;
        seen.add(href);
        out.push(href);
      } catch {
        continue;
      }
    }
  }
  return out;
}
