import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET ?productId= — đã đăng nhập và có trong wishlist không */
export async function GET(req: Request) {
  const session = await getSession();
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId")?.trim();
  if (!session || !productId) {
    return NextResponse.json({ inWishlist: false });
  }
  const row = await prisma.wishlist.findFirst({
    where: { userId: session.sub, productId },
    select: { productId: true },
  });
  return NextResponse.json({ inWishlist: !!row });
}

/** Toggle wishlist theo productId */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const productId = typeof json?.productId === "string" ? json.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "Thiếu productId" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }

  const existing = await prisma.wishlist.findFirst({
    where: { userId: session.sub, productId },
    select: { productId: true },
  });

  if (existing) {
    await prisma.wishlist.deleteMany({
      where: { userId: session.sub, productId },
    });
  } else {
    await prisma.wishlist.create({
      data: { userId: session.sub, productId },
    });
  }

  const count = await prisma.wishlist.count({
    where: { userId: session.sub },
  });

  return NextResponse.json({
    inWishlist: !existing,
    count,
  });
}
