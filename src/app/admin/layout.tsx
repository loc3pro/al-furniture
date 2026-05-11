import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminNavSectionsForRole } from "@/components/admin/admin-nav-config";
import { AdminAntdGate } from "@/design-system/AdminAntdGate";
import { getSession } from "@/lib/session";
import { getThemeSettings, resolveAdminSidebarStoreName } from "@/lib/theme";
/** CSS dashboard v1 — chỉ segment `/admin`; shop dùng `(shop)/layout` + `shop-ui.scss`, không import file này. */
import "@/dashboard-ui/v1/admin-dashboard.scss";
import "./admin-shell-globals.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeSettings();
  const session = await getSession();
  const navSections = getAdminNavSectionsForRole(session?.role);
  return (
    <AdminAntdGate>
    <AdminShell
      adminLogoUrl={theme.logoUrl}
      adminBrandBesideText={theme.brandText?.trim() || null}
      adminShowBrandBesideLogo={theme.headerShowBrandBesideLogo ?? false}
      adminStoreName={resolveAdminSidebarStoreName(theme)}
      navSections={navSections}
    >
      {children}
    </AdminShell>
    </AdminAntdGate>
  );
}
