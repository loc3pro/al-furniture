/** Link banner: đường dẫn nội bộ (/products, /products?q=…) hoặc URL http(s). */
export function isValidBannerLink(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Chuẩn hoá link nhập tay: giữ đường dẫn `/…`; với URL đầy đủ (http/https, hoặc domain không ghi scheme)
 * tách phần path + query + hash để lưu dạng nội bộ.
 */
export function normalizeBannerLink(raw: string): string {
  const t = raw.trim();
  if (!t) return "";

  if (t.startsWith("/") && !t.startsWith("//")) {
    const collapsed = t.replace(/\/{2,}/g, "/");
    return collapsed.length ? collapsed : "/";
  }

  const firstSeg = t.split("/")[0] ?? "";
  const looksLikeHost =
    /\./.test(firstSeg) || /^localhost\b/i.test(firstSeg) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/i.test(firstSeg);

  let href = t;
  if (t.startsWith("//")) {
    href = `https:${t}`;
  } else if (!/^https?:\/\//i.test(t)) {
    if (!looksLikeHost) return t;
    href = `https://${t.replace(/^\/+/, "")}`;
  }

  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return t;
    const path = (u.pathname || "/") + u.search + u.hash;
    const collapsed = path.replace(/\/{2,}/g, "/");
    return collapsed.length ? collapsed : "/";
  } catch {
    return t;
  }
}
