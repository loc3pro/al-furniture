import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { getAdminReportsSummary } from "@/lib/admin-reports-summary";
import { AdminReportsDashboard } from "./AdminReportsDashboard";
import styles from "./reports.module.scss";

export default async function AdminReportsPage() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  const initial = await getAdminReportsSummary(from, to);

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <h1 className={styles.title}>Báo cáo</h1>
          <p className={styles.lead}>
            Chọn khoảng ngày (mặc định 30 ngày gần nhất) để xem biểu đồ, bảng và xuất CSV doanh thu đúng theo
            khoảng đó.
          </p>
        </AdminStickyPageHeader>
      }
    >
      <AdminReportsDashboard initial={initial} />
    </AdminPageLayout>
  );
}
