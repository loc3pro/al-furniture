import { NextResponse } from "next/server";
import { loadPublicRetailStoresForApi } from "@/lib/public-catalog-db";

/** Cửa hàng đang bật — dùng cho trang liên hệ, footer (Redis + TTL). */
export async function GET() {
  const stores = await loadPublicRetailStoresForApi();
  return NextResponse.json(
    { stores },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
