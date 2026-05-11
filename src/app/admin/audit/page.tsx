import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { ADMIN_PAGE_SIZE_DEFAULT, parseAdminPage } from "@/lib/admin-pagination";
import { adminAuditLogWhereForTab, parseAdminAuditTab } from "@/lib/admin-audit";
import { staffDisplayName } from "@/lib/admin-staff-label";
import styles from "./admin-audit.module.scss";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

const ACTION_VI: Record<string, string> = {
  "product.create": "Tạo sản phẩm",
  "product.update": "Cập nhật sản phẩm",
  "product.delete": "Xóa sản phẩm",
  "order.manual_create": "Tạo đơn thủ công",
  "order.status_change": "Đổi trạng thái đơn",
  "order.delete": "Xóa đơn hàng",
  "user.create": "Tạo người dùng",
  "ui.theme_update": "Lưu theme & hiển thị cửa hàng",
  "ui.homepage_update": "Cập nhật cấu hình trang chủ",
  "ui.navigation_menu_update": "Cập nhật menu header",
  "ui.banner_create": "Tạo banner",
  "ui.banner_update": "Sửa banner",
  "ui.banner_delete": "Xóa banner",
  "ui.banner_reorder": "Sắp xếp lại banner",
};

type PageProps = { searchParams: Promise<{ page?: string; tab?: string }> };

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const pageNum = parseAdminPage(sp.page);
  const tab = parseAdminAuditTab(sp.tab);
  const skip = (pageNum - 1) * PAGE_SIZE;
  const where = adminAuditLogWhereForTab(tab);

  let logs: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string | null;
    createdAt: Date;
    actor: { name: string | null; email: string | null } | null;
  }[] = [];
  let total = 0;

  try {
    ;[logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);
  } catch {
    logs = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const auditPaginationQuery: Record<string, string | undefined> = {};
  if (tab === "ui") auditPaginationQuery.tab = "ui";

  const lead =
    tab === "ui"
      ? "Ai đã lưu theme, trang chủ, menu header hoặc banner (ảnh hiển thị trên site)."
      : "Ghi nhận tạo / sửa / xóa sản phẩm; tạo đơn thủ công; đổi trạng thái hoặc xóa đơn; tạo người dùng (theo tài khoản admin đăng nhập).";

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <h1 className={styles.title}>Nhật ký thao tác</h1>
          <p className={styles.lead}>{lead}</p>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove>
          <nav className={styles.tabNav} role="tablist" aria-label="Phân loại nhật ký">
            <Link
              href="/admin/audit"
              role="tab"
              aria-selected={tab === "data"}
              className={`${styles.tab} ${tab === "data" ? styles.tabActive : ""}`}
            >
              Nghiệp vụ
            </Link>
            <Link
              href="/admin/audit?tab=ui"
              role="tab"
              aria-selected={tab === "ui"}
              className={`${styles.tab} ${tab === "ui" ? styles.tabActive : ""}`}
            >
              Giao diện (UI)
            </Link>
          </nav>
        </AdminToolbarStrip>
      }
    >
      <div className={styles.shellCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <NoDataEmpty colSpan={5} cellClassName={styles.emptyCell} />
              ) : (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.mono}>{new Date(row.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{staffDisplayName(row.actor)}</td>
                    <td>{ACTION_VI[row.action] ?? row.action}</td>
                    <td>
                      {row.entityType}
                      {row.entityId ? (
                        <>
                          <br />
                          <span className={styles.mono}>{row.entityId.slice(-12)}</span>
                        </>
                      ) : null}
                    </td>
                    <td className={styles.meta}>{row.summary ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          queryNav={{
            pathname: "/admin/audit",
            query: auditPaginationQuery,
            defaultPageSize: PAGE_SIZE,
          }}
          page={pageNum}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          itemLabel="bản ghi"
        />
      </div>
    </AdminPageLayout>
  );
}
