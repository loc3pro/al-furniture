/** Trả về URL iframe nếu `mapUrl` là link nhúng Google Maps (embed). */
export function embeddableMapSrc(mapUrl: string | null | undefined): string | null {
  if (!mapUrl?.trim()) return null;
  const u = mapUrl.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  if (/\/embed/i.test(u)) return u;
  return null;
}

/**
 * URL iframe «mini bản đồ» cho checkout / showroom:
 * 1) Link embed có sẵn trong admin
 * 2) Không có embed → dùng địa chỉ cửa hàng (`q=` Google Maps `output=embed`)
 * 3) Hoặc lấy `q=` / `query` / `destination` từ link Maps thường
 */
export function previewMapIframeSrc(args: {
  mapUrl: string | null | undefined;
  fallbackAddress: string | null | undefined;
}): string | null {
  const embed = embeddableMapSrc(args.mapUrl);
  if (embed) return embed;

  const addr = args.fallbackAddress?.trim();
  if (addr) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=16&output=embed&hl=vi`;
  }

  const raw = args.mapUrl?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;

  try {
    const u = new URL(raw);
    const q =
      u.searchParams.get("q") ||
      u.searchParams.get("query") ||
      u.searchParams.get("destination");
    if (q) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed&hl=vi`;
    }
  } catch {
    return null;
  }

  return null;
}

/** Link mở Google Maps (tab mới) — ưu tiên URL admin, không có thì search theo địa chỉ. */
export function externalMapsHref(mapUrl: string | null | undefined, fallbackAddress: string | null | undefined): string | null {
  const u = mapUrl?.trim();
  if (u && /^https?:\/\//i.test(u)) return u;
  const addr = fallbackAddress?.trim();
  if (!addr) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}
