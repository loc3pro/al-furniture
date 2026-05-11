/** Đường dẫn `/admin/...` mà role SELLER được vào (khớp menu seller + tạo đơn). */
export function isSellerAllowedAdminPath(pathname: string): boolean {
  const p = pathname.split("?")[0] || "";
  if (p === "/admin") return true;
  if (p === "/admin/orders/new" || p.startsWith("/admin/orders/new/")) return true;
  const prefixes = [
    "/admin/homepage",
    "/admin/banners",
    "/admin/categories",
    "/admin/shop-the-look",
    "/admin/chat",
    "/admin/spin-wheel",
    "/admin/faq",
  ] as const;
  return prefixes.some((pre) => p === pre || p.startsWith(`${pre}/`));
}
