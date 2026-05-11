import { parseAdminPage } from "@/lib/admin-pagination";
import { BannersClient } from "./BannersClient";

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const listPage = parseAdminPage(sp.page);
  return <BannersClient listPage={listPage} />;
}
