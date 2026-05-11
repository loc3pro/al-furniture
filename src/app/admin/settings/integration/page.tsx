import { prisma } from "@/lib/prisma";
import { SystemIntegrationClient, type InitialPayload } from "../../system-integration/SystemIntegrationClient";

export default async function AdminSettingsIntegrationPage() {
  let row = null;
  try {
    row = await prisma.siteIntegrationSettings.findUnique({ where: { id: "default" } });
  } catch {
    row = null;
  }

  const initial: InitialPayload = {
    general: row?.general ?? {},
    api: row?.api ?? {},
    payment: row?.payment ?? {},
    cloud: row?.cloud ?? {},
    seo: row?.seo ?? {},
    display: row?.display ?? {},
  };

  return <SystemIntegrationClient initial={initial} />;
}
