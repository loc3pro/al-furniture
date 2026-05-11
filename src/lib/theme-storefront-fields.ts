/**
 * Mô tả từng trường theme → CSS variables trên storefront (`src/app/layout.tsx`).
 * Dùng chung cho bảng gợi ý admin và form chi tiết.
 */

export type ThemeColorKey =
  | "primaryColor"
  | "accentColor"
  | "headerBg"
  | "menuColor"
  | "textOnPrimary"
  | "buttonHoverBg";

/** Giá trị gốc (seed DB + `lib/theme.ts`) — dùng nút « Khôi phục mặc định » trong admin. */
export const STOREFRONT_THEME_FACTORY_DEFAULTS = {
  primaryColor: "#2C2620",
  accentColor: "#8B7355",
  headerBg: "#F7F4EF",
  menuColor: "#1A1612",
  textOnPrimary: "#FAF8F5",
  footerNote: "Furniture ECM",
  brandText: "",
  headerShowBrandBesideLogo: false,
  headerStoreName: "",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  headerHotlineLabel: "Hotline",
  headerHotlinePhone: "0931 799 744",
  headerShippingLine1: "Miễn phí vận chuyển HCM",
  headerShippingLine2: "Hóa đơn trên 2.000.000₫",
  buttonHoverBg: "#EBE5DF",
} as const;

export const STOREFRONT_THEME_COLOR_FIELDS: {
  key: ThemeColorKey;
  label: string;
  shortLabel: string;
  hint: string;
  cssVar: string;
  usedFor: string;
}[] = [
  {
    key: "primaryColor",
    label: "Màu chủ đạo",
    shortLabel: "Chủ",
    hint: "Nút chính, thanh nổi bật, viền nhấn mạnh.",
    cssVar: "--color-primary",
    usedFor: "Nút (primary), khối nổi bật",
  },
  {
    key: "accentColor",
    label: "Màu accent",
    shortLabel: "Accent",
    hint: "Link khi hover, giá, badge phụ — tách khỏi màu chủ.",
    cssVar: "--color-accent",
    usedFor: "Link, giá, điểm nhấn phụ",
  },
  {
    key: "headerBg",
    label: "Nền header",
    shortLabel: "Header",
    hint: "Thanh trên cùng (logo, tìm kiếm, menu).",
    cssVar: "--color-header-bg",
    usedFor: "Nền thanh đầu trang",
  },
  {
    key: "menuColor",
    label: "Chữ / icon menu",
    shortLabel: "Menu",
    hint: "Chữ điều hướng, icon trên nền header.",
    cssVar: "--color-menu",
    usedFor: "Menu, icon header",
  },
  {
    key: "textOnPrimary",
    label: "Chữ trên nút đậm",
    shortLabel: "Trên nút",
    hint: "Chữ và icon nền màu chủ (nút primary).",
    cssVar: "--color-on-primary",
    usedFor: "Chữ trên nút primary",
  },
  {
    key: "buttonHoverBg",
    label: "Nền hover nút (cửa hàng)",
    shortLabel: "Hover nút",
    hint: "Màu nền khi rê chuột lên nút / submit trên website khách.",
    cssVar: "--color-button-hover",
    usedFor: "Hover `.btn`, `button`, `input[type=submit]` trong storefront",
  },
];
