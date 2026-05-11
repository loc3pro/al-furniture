import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminReportsSummary,
  parseIsoDateOrNull,
  validateRangeDays,
} from "@/lib/admin-reports-summary";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const fromRaw = parseIsoDateOrNull(searchParams.get("from"));
  const toRaw = parseIsoDateOrNull(searchParams.get("to"));

  const today = new Date().toISOString().slice(0, 10);
  const fallbackStart = new Date();
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 29);
  const defaultFrom = fallbackStart.toISOString().slice(0, 10);

  const fromIso = fromRaw ?? defaultFrom;
  const toIso = toRaw ?? today;

  if (fromIso > toIso) {
    return NextResponse.json({ error: "Ngày bắt đầu không được sau ngày kết thúc." }, { status: 400 });
  }

  const valid = validateRangeDays(fromIso, toIso);
  if (valid === null) {
    return NextResponse.json(
      { error: "Khoảng ngày không hợp lệ (tối đa 366 ngày)." },
      { status: 400 },
    );
  }

  try {
    const payload = await getAdminReportsSummary(fromIso, toIso);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Không tải được báo cáo." }, { status: 500 });
  }
}
