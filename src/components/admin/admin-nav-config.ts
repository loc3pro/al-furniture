export type AdminNavLeaf = { href: string; label: string };

export type AdminNavBranch = { id: string; label: string; children: AdminNavLeaf[] };

export type AdminNavNode = AdminNavLeaf | AdminNavBranch;

export type AdminNavSection = { title: string; items: AdminNavNode[] };

export function isNavBranch(node: AdminNavNode): node is AdminNavBranch {
  return "children" in node && "id" in node;
}

function collectLeaves(nodes: AdminNavNode[]): AdminNavLeaf[] {
  return nodes.flatMap((n) => (isNavBranch(n) ? n.children : [n]));
}

/** Một danh sách menu (không heading nhóm). */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "",
    items: [
      { href: "/admin", label: "Tổng quan" },
      {
        id: "nav-content",
        label: "Trang & nội dung",
        children: [
          { href: "/admin/homepage", label: "Trang chủ" },
          { href: "/admin/banners", label: "Banner" },
          { href: "/admin/blog", label: "Blog" },
          { href: "/admin/navigation-menu", label: "Menu header" },
        ],
      },
      {
        id: "nav-products",
        label: "Sản phẩm & Lookbook",
        children: [
          { href: "/admin/products", label: "Sản phẩm" },
          { href: "/admin/categories", label: "Danh mục" },
          { href: "/admin/shop-the-look", label: "Shop the Look" },
        ],
      },
      {
        id: "nav-orders",
        label: "Đơn hàng & cửa hàng",
        children: [
          { href: "/admin/orders", label: "Đơn hàng" },
          { href: "/admin/stores-banking", label: "Cửa hàng & NH" },
        ],
      },
      {
        id: "nav-customers",
        label: "Khách hàng",
        children: [
          { href: "/admin/users", label: "Người dùng" },
          { href: "/admin/chat", label: "Chat" },
        ],
      },
      {
        id: "nav-reports",
        label: "Báo cáo & nhật ký",
        children: [
          { href: "/admin/reports", label: "Báo cáo" },
          { href: "/admin/audit", label: "Nhật ký thao tác" },
        ],
      },
      { href: "/admin/spin-wheel", label: "Vòng quay" },
      {
        id: "nav-settings",
        label: "Cài đặt & nâng cao",
        children: [
          { href: "/admin/settings", label: "Cài đặt & tích hợp" },
          { href: "/admin/faq", label: "FAQ" },
          { href: "/admin/html-suggestions", label: "Gợi ý HTML" },
        ],
      },
    ],
  },
];

export const ADMIN_NAV_FLAT: AdminNavLeaf[] = ADMIN_NAV_SECTIONS.flatMap((s) => collectLeaves(s.items));

/** Menu gọn cho seller (trùng quyền với `isSellerAllowedAdminPath`). */
export const SELLER_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "",
    items: [
      { href: "/admin", label: "Tổng quan" },
      { href: "/admin/homepage", label: "Trang chủ" },
      { href: "/admin/banners", label: "Banner" },
      { href: "/admin/categories", label: "Danh mục" },
      { href: "/admin/shop-the-look", label: "Shop the Look" },
      { href: "/admin/orders/new", label: "Tạo đơn" },
      { href: "/admin/chat", label: "Chat" },
      { href: "/admin/spin-wheel", label: "Vòng quay" },
      { href: "/admin/faq", label: "FAQ" },
    ],
  },
];

export function getAdminNavSectionsForRole(role: string | null | undefined): AdminNavSection[] {
  if (role === "SELLER") return SELLER_ADMIN_NAV_SECTIONS;
  return ADMIN_NAV_SECTIONS;
}

export function adminNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href !== "/admin" && pathname.startsWith(href)) return true;
  return false;
}

export function branchHasActiveChild(pathname: string | null, branch: AdminNavBranch): boolean {
  return branch.children.some((c) => adminNavItemActive(pathname, c.href));
}

export function getAdminNavFlat(sections: AdminNavSection[]): AdminNavLeaf[] {
  return sections.flatMap((s) => collectLeaves(s.items));
}

export function getAdminSelectedMenuKey(
  pathname: string | null,
  sections: AdminNavSection[] = ADMIN_NAV_SECTIONS,
): string {
  const flat = getAdminNavFlat(sections);
  const matches = flat.filter((item) => adminNavItemActive(pathname, item.href));
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href ?? "/admin";
}
