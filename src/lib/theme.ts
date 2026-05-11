import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTTL, redisCached } from "@/lib/redis-cache";

export const DEFAULT_BRAND_TEXT = "Furniture ECM";

const FALLBACK_BUTTON_HOVER = "#EBE5DF";

const defaults = {
  id: "default",
  primaryColor: "#2C2620",
  accentColor: "#8B7355",
  headerBg: "#F7F4EF",
  menuColor: "#1A1612",
  textOnPrimary: "#FAF8F5",
  logoUrl: null as string | null,
  logoDarkUrl: null as string | null,
  faviconUrl: null as string | null,
  brandText: null as string | null,
  headerShowBrandBesideLogo: false,
  headerStoreName: null as string | null,
  footerNote: "Furniture ECM",
  socialLinks: null as unknown,
  headerHotlineLabel: "Hotline",
  headerHotlinePhone: "0931 799 744",
  headerShippingLine1: "Miễn phí vận chuyển HCM",
  headerShippingLine2: "Hóa đơn trên 2.000.000₫",
  buttonHoverBg: FALLBACK_BUTTON_HOVER,
};

/** Chữ hiển thị trên header khi không có logo. */
export function resolveBrandText(theme: { brandText?: string | null } | null): string {
  const t = theme?.brandText?.trim();
  return t || DEFAULT_BRAND_TEXT;
}

/** Tên cửa hàng cạnh logo — chỉ khi admin nhập; không có thì null. */
export function resolveHeaderStoreName(theme: { headerStoreName?: string | null } | null): string | null {
  const t = theme?.headerStoreName?.trim();
  return t || null;
}

/** Tên hiển thị cạnh logo sidebar admin — mặc định khi DB trống. */
export const DEFAULT_ADMIN_SIDEBAR_STORE_NAME = "AL Furniture";

export function resolveAdminSidebarStoreName(theme: { headerStoreName?: string | null } | null): string {
  const t = theme?.headerStoreName?.trim();
  return t || DEFAULT_ADMIN_SIDEBAR_STORE_NAME;
}

const FALLBACK_HOTLINE_LABEL = defaults.headerHotlineLabel;
const FALLBACK_HOTLINE_PHONE = defaults.headerHotlinePhone;
const FALLBACK_SHIP_1 = defaults.headerShippingLine1;
const FALLBACK_SHIP_2 = defaults.headerShippingLine2;

/** Chuẩn hoá số cho thuộc tính `tel:` — chỉ giữ chữ số. */
export function phoneDigitsForTel(display: string): string {
  return display.replace(/\D/g, "");
}

export function resolveHeaderHotline(theme: { headerHotlineLabel?: string; headerHotlinePhone?: string } | null): {
  label: string;
  phoneDisplay: string;
  /** Chỉ chữ số — dùng cho `tel:` và thanh nổi. */
  phoneDigits: string;
  telHref: string | null;
} {
  const label = theme?.headerHotlineLabel?.trim() || FALLBACK_HOTLINE_LABEL;
  const phoneDisplay = theme?.headerHotlinePhone?.trim() || FALLBACK_HOTLINE_PHONE;
  const phoneDigits = phoneDigitsForTel(phoneDisplay);
  return {
    label,
    phoneDisplay,
    phoneDigits,
    telHref: phoneDigits ? `tel:${phoneDigits}` : null,
  };
}

export function resolveHeaderShipping(theme: {
  headerShippingLine1?: string;
  headerShippingLine2?: string;
} | null): { line1: string; line2: string } {
  return {
    line1: theme?.headerShippingLine1?.trim() || FALLBACK_SHIP_1,
    line2: theme?.headerShippingLine2?.trim() || FALLBACK_SHIP_2,
  };
}

/** Màu nền hover nút storefront — từ ThemeSettings; mặc định #EBE5DF. */
export function resolveButtonHoverBg(theme: { buttonHoverBg?: string | null } | null | undefined): string {
  const v = theme?.buttonHoverBg?.trim();
  return v || FALLBACK_BUTTON_HOVER;
}

export async function getThemeSettings() {
  return redisCached(CacheKeys.theme(), CacheTTL.theme, async () => {
    try {
      const row = await prisma.themeSettings.findUnique({ where: { id: "default" } });
      return row ?? defaults;
    } catch {
      return defaults;
    }
  });
}
