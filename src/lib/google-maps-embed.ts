/**
 * URL iframe Google Maps — an toàn embed same-origin Google.
 * `mapUrl`: link Maps do admin nhập (vd search ?query=lat,lng); không có thì dùng địa chỉ.
 */
export function toGoogleMapsEmbedSrc(mapUrl: string | null | undefined, address: string): string {
  const addr = address.trim() || "Việt Nam";
  const fallback = `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;

  if (!mapUrl?.trim()) return fallback;

  const raw = mapUrl.trim();

  if (raw.includes("/maps/embed") || raw.includes("output=embed")) {
    return raw;
  }

  try {
    const u = new URL(raw.indexOf("://") === -1 ? `https://${raw}` : raw);
    const query = u.searchParams.get("query") ?? u.searchParams.get("q");
    if (query) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }
  } catch {
    // ignore
  }

  return fallback;
}
