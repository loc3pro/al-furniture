import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminBackLink } from "@/components/admin/AdminBackNav";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { ManualOrderForm } from "./ManualOrderForm";

export default function AdminManualOrderPage() {
  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className="adminPageHeaderRow">
            <div
              className="adminPageHeaderMain"
              style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "nowrap", minWidth: 0 }}
            >
              <AdminBackLink href="/admin/orders">Tạo đơn</AdminBackLink>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      <div style={{ marginTop: "0.75rem" }}>
        <ManualOrderForm />
      </div>
    </AdminPageLayout>
  );
}
