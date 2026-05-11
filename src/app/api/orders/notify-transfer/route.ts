import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatVnd } from "@/lib/money";
import { resolvePaymentChannel } from "@/lib/order-payment-display";

const GUEST_CHAT_COOKIE = "furniture_guest_chat";

const bodySchema = z.object({
  orderId: z.string().min(8),
  /** Phải trùng SĐT trên đơn (chuẩn hoá 84→0) */
  phone: z.string().min(8).max(20),
  /** Khớp số tiền khách đã chọn trên trang (VNĐ) — gửi kèm trong chat */
  amountHint: z.number().int().positive().optional(),
});

function normPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("84") && d.length >= 10) d = `0${d.slice(2)}`;
  return d;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }
  const { orderId, phone, amountHint } = parsed.data;
  const session = await getSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentTxs: { orderBy: { createdAt: "asc" }, take: 4 } },
  });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  }

  const channel = resolvePaymentChannel(order);
  if (channel !== "BANK_TRANSFER") {
    return NextResponse.json({ error: "Đơn không phải thanh toán chuyển khoản." }, { status: 400 });
  }

  const addr = order.shippingAddress as Record<string, string>;
  const orderPhone = normPhone(addr.phone ?? "");
  const callerPhone = normPhone(phone);
  if (!callerPhone || orderPhone !== callerPhone) {
    return NextResponse.json({ error: "Số điện thoại không khớp đơn hàng." }, { status: 403 });
  }

  if (session?.sub && order.userId && order.userId !== session.sub) {
    return NextResponse.json({ error: "Không khớp tài khoản đặt hàng." }, { status: 403 });
  }

  const jar = await cookies();
  let guestKey = jar.get(GUEST_CHAT_COOKIE)?.value ?? null;
  if (!guestKey) {
    guestKey = crypto.randomUUID();
    jar.set(GUEST_CHAT_COOKIE, guestKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let chat = await prisma.chatSession.findFirst({
    where: session?.sub
      ? { userId: session.sub }
      : { guestKey },
    orderBy: { createdAt: "desc" },
  });

  if (!chat) {
    chat = await prisma.chatSession.create({
      data: {
        userId: session?.sub ?? null,
        guestKey: session?.sub ? null : guestKey,
        status: "OPEN",
      },
    });
  }

  const ref = order.orderNumber;
  const shipMeta = order.shippingAddress as Record<string, unknown>;
  const depositNegotiated = shipMeta?.depositNegotiated === true;
  const amtLine =
    amountHint != null
      ? ` · Số khách báo: ${formatVnd(amountHint)}`
      : order.payMode === "DEPOSIT" && order.depositDue != null
        ? ` · Cọc (đơn): ${formatVnd(order.depositDue)}`
        : ` · Tổng đơn: ${formatVnd(order.totalAmount)}`;

  const text = depositNegotiated
    ? `🏦 Khách báo đã chuyển khoản (cọc thỏa thuận) — Đơn ${ref}${amtLine}. Khách có thể nhắn chat để thống nhất — đối soát CK.`
    : `🏦 Khách báo đã chuyển khoản — Đơn ${ref}${amtLine}. Vui lòng đối soát ngân hàng (kênh chat).`;

  await prisma.chatMessage.create({
    data: {
      sessionId: chat.id,
      sender: "USER",
      message: text,
    },
  });

  await prisma.chatSession.update({
    where: { id: chat.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
