import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseContentLocaleParam } from "@/lib/content-locale";

type Ctx = { params: Promise<{ locale: string; id: string }> };

const COOKIE_PREFIX = "pv_";
const MAX_AGE_SEC = 86400;

/** POST — tăng viewCount tối đa 1 lần / ngày / sản phẩm / trình duyệt (cookie). `locale` chỉ để khớp đường dẫn API. */
export async function POST(_req: Request, ctx: Ctx) {
  const { locale: raw, id } = await ctx.params;
  if (!parseContentLocaleParam(raw)) {
    return NextResponse.json({ error: "Locale must be vi or en" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  }

  try {
    const jar = await cookies();
    const key = `${COOKIE_PREFIX}${id}`;
    if (jar.get(key)?.value) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    jar.set(key, "1", {
      maxAge: MAX_AGE_SEC,
      sameSite: "lax",
      path: "/",
      httpOnly: true,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không ghi được lượt xem" }, { status: 500 });
  }
}
