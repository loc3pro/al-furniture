import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Tiền tố `action` cho nhật ký chỉnh giao diện / nội dung hiển thị shop (lọc tab «UI»). */
export const ADMIN_UI_AUDIT_PREFIX = "ui." as const;

export type AdminAuditLogTab = "data" | "ui";

export function parseAdminAuditTab(tab: string | undefined): AdminAuditLogTab {
  return tab === "ui" ? "ui" : "data";
}

export function adminAuditLogWhereForTab(tab: AdminAuditLogTab): Prisma.AdminAuditLogWhereInput {
  if (tab === "ui") {
    return { action: { startsWith: ADMIN_UI_AUDIT_PREFIX } };
  }
  return { NOT: { action: { startsWith: ADMIN_UI_AUDIT_PREFIX } } };
}

/** Ghi nhật ký admin — không throw để không làm hỏng luồng chính. */
export async function recordAdminAudit(input: {
  actorUserId: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        metadata:
          input.metadata === undefined || input.metadata === null ? undefined : (input.metadata as object),
      },
    });
  } catch (e) {
    console.warn("[admin-audit] record failed:", e);
  }
}
