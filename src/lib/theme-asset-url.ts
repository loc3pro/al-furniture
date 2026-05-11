/**
 * Kiểm tra URL logo/favicon theme trước khi đưa vào `<img src>` / `<link rel="icon">`.
 * Cho phép đường dẫn tuyệt đối trong site (`/…`) và http(s).
 */
export function isSafeThemeAssetUrl(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const u = raw.trim();
  if (!u) return false;
  if (u.startsWith("/")) {
    if (u.startsWith("//")) return false;
    return !u.includes("..");
  }
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
