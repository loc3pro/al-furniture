"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import { AdminOrderPanelBody } from "./AdminOrderPanelBody";

/** Desktop: panel chi tiết (button). Mobile: router.push tới trang đơn. */
export function AdminOrderOpenLink({
  orderId,
  orderNumber,
  className,
  title,
  children,
}: {
  orderId: string;
  /** Mã hiển thị O00000000001 */
  orderNumber: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { openPanel } = useAdminRightPanel();
  const resolvedTitle = title?.trim() || `Đơn ${orderNumber}`;

  return (
    <button
      type="button"
      className={className}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      onClick={() => {
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches) {
          openPanel({
            title: resolvedTitle,
            content: <AdminOrderPanelBody orderId={orderId} />,
          });
        } else {
          router.push(`/admin/orders/${orderId}`);
        }
      }}
    >
      {children}
    </button>
  );
}
