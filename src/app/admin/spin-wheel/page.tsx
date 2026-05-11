import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SpinWheelSegment } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  SpinWheelAdminClient,
  type SpinWheelAdminConfig,
  type SpinWheelAdminSegment,
} from "./SpinWheelAdminClient";

function mapSegment(row: SpinWheelSegment): SpinWheelAdminSegment {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    label: row.label,
    weight: Number(row.weight),
    quantityCap: row.quantityCap,
    quantityWon: row.quantityWon,
    discountType: row.discountType,
    discountValue: row.discountValue,
    discountMaxVnd: row.discountMaxVnd,
    validityDays: row.validityDays,
    minOrderAmount: row.minOrderAmount,
    active: row.active,
  };
}

export default async function AdminSpinWheelPage() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    redirect("/auth/login?next=%2Fadmin%2Fspin-wheel");
  }

  const [cfgRow, segmentRows] = await Promise.all([
    prisma.spinWheelConfig.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    }),
    prisma.spinWheelSegment.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const initialConfig: SpinWheelAdminConfig = {
    eventActive: cfgRow.eventActive,
    bannerTitle: cfgRow.bannerTitle,
    startsAt: cfgRow.startsAt?.toISOString() ?? null,
    endsAt: cfgRow.endsAt?.toISOString() ?? null,
    maxSpinsPerUserDay: cfgRow.maxSpinsPerUserDay,
  };

  const initialSegments = segmentRows.map(mapSegment);

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className="adminPageHeaderMain">
            <h1>Vòng quay & coupon</h1>
          </div>
        </AdminStickyPageHeader>
      }
    >
      <SpinWheelAdminClient initialConfig={initialConfig} initialSegments={initialSegments} />
    </AdminPageLayout>
  );
}
