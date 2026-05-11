import { NextResponse } from "next/server";
import { loadPublicBankAccountsForApi } from "@/lib/public-catalog-db";

/** Tài khoản ngân hàng đang bật — dùng hướng dẫn CK (Redis + TTL). */
export async function GET() {
  const accounts = await loadPublicBankAccountsForApi();
  /** qrCodeUrl: thêm vào select sau khi DB & prisma generate có cột `qrCodeUrl`. */
  return NextResponse.json(
    {
      accounts: accounts.map((a) => ({ ...a, qrCodeUrl: null as string | null })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
