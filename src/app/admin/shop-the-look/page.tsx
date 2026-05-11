import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { AdminShopTheLookTable } from "./AdminShopTheLookTable";
import styles from "./admin-shop-the-look.module.scss";

export const metadata = { title: "Shop the Look — Admin" };

export default async function AdminShopTheLookListPage() {
  let rows: {
    id: string;
    slug: string;
    title: string;
    published: boolean;
    updatedAt: Date;
    _count: { hotspots: number };
  }[] = [];

  try {
    rows = await prisma.shopTheLook.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        updatedAt: true,
        _count: { select: { hotspots: true } },
      },
    });
  } catch {
    rows = [];
  }

  const tableRows = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    published: r.published,
    updatedAtLabel: r.updatedAt.toLocaleString("vi-VN"),
    hotspotCount: r._count.hotspots,
  }));

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={`adminPageHeaderRow ${styles.head}`}>
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>Shop the Look</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <Link
                href="/admin/shop-the-look/new"
                className="btn btn--primary adminToolbarBtn"
                title="Tạo bài Shop the Look mới"
              >
                + Tạo
              </Link>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {tableRows.length === 0 ? (
        <NoDataEmpty
          className={styles.empty}
          description='Bấm «Tạo» trên thanh công cụ để thêm ảnh và hotspot.'
        />
      ) : (
        <AdminShopTheLookTable rows={tableRows} />
      )}
    </AdminPageLayout>
  );
}
