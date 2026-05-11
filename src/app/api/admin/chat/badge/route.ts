import { NextResponse } from "next/server";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { getStaffUnreadCounts, totalUnread } from "@/lib/chat-unread";

export const dynamic = "force-dynamic";

/** Badge nhẹ cho sidebar / polling */
export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const map = await getStaffUnreadCounts();
  return NextResponse.json({ total: totalUnread(map) });
}
