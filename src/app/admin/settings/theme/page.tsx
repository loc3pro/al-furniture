import { prisma } from "@/lib/prisma";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";

export default async function AdminSettingsThemePage() {
  let themeInitial = null;
  try {
    themeInitial = await prisma.themeSettings.findUnique({ where: { id: "default" } });
  } catch {
    themeInitial = null;
  }
  return <AdminSettingsPage themeInitial={themeInitial} />;
}
