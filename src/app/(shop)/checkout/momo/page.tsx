"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatVnd } from "@/lib/money";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { Spinner } from "@/components/ui/Spinner";

type PreviewItem = {
  productName: string;
  productSlug: string;
  thumbUrl: string | null;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type Preview = {
  orderId: string;
  totalAmount: number;
  amountToPay: number;
  payMode?: string;
  depositDue?: number | null;
  balanceDue?: number | null;
  items: PreviewItem[];
};

function MomoInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const orderId = sp.get("orderId");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [prevErr, setPrevErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetch(`/api/public/order-momo-preview?orderId=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPrevErr(typeof data.error === "string" ? data.error : "Không tải được đơn");
          return;
        }
        if (!cancelled) setPreview(data as Preview);
      })
      .catch(() => setPrevErr("Lỗi mạng"));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) {
    return <p className="muted">Thiếu mã đơn.</p>;
  }

  async function confirm() {
    if (!orderId) return;
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/payment/momo/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Thanh toán thất bại");
      setLoading(false);
      return;
    }
    router.replace(`/checkout/done?id=${encodeURIComponent(orderId)}`);
  }

  return (
    <div>
      <p style={{ marginBottom: "1rem" }}>
        Bước <strong>MoMo (sandbox / demo)</strong>. Production sẽ chuyển hướng sang ví MoMo; tại đây hiển thị{" "}
        <strong>sản phẩm trong đơn</strong> để bạn kiểm tra trước khi xác nhận mock.
      </p>

      {prevErr ? (
        <p style={{ color: "crimson", marginBottom: "1rem" }}>{prevErr}</p>
      ) : null}

      {preview ? (
        <div
          style={{
            border: "1px solid rgba(26,22,18,0.12)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: "1.25rem",
            background: "#fff",
          }}
        >
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(26,22,18,0.08)", fontWeight: 700 }}>
            Chi tiết đơn · Thanh toán ngay: {formatVnd(preview.amountToPay ?? preview.totalAmount)}
            {preview.payMode === "DEPOSIT" && preview.balanceDue != null ? (
              <span className="muted" style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, marginTop: 4 }}>
                Giá trị đơn {formatVnd(preview.totalAmount)} · Còn lại {formatVnd(preview.balanceDue)}
              </span>
            ) : null}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {preview.items.map((it, idx) => (
              <li
                key={`${it.productSlug}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr auto",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "0.85rem 1rem",
                  borderBottom:
                    idx < preview.items.length - 1 ? "1px solid rgba(26,22,18,0.06)" : undefined,
                }}
              >
                <Link
                  href={`/products/${it.productSlug}`}
                  style={{
                    position: "relative",
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#ece8e2",
                  }}
                >
                  {it.thumbUrl ? (
                    <Image
                      src={it.thumbUrl}
                      alt=""
                      fill
                      sizes="56px"
                      loading="lazy"
                      style={{ objectFit: "cover" }}
                    />
                  ) : null}
                </Link>
                <div>
                  <Link href={`/products/${it.productSlug}`} style={{ fontWeight: 600 }}>
                    {it.productName}
                  </Link>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {it.color} · {it.size} · ×{it.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, textAlign: "right" }}>{formatVnd(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : !prevErr ? (
        <div style={{ marginBottom: "1rem" }}>
          <Spinner size="md" label="Đang tải sản phẩm" />
        </div>
      ) : null}

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      <button type="button" className="btn btn--primary" disabled={loading} onClick={confirm}>
        {loading ? <Spinner size="sm" inheritColor label="Đang xử lý" /> : "Hoàn tất thanh toán (mock)"}
      </button>
    </div>
  );
}

export default function MomoMockPage() {
  return (
    <div className="container" style={{ padding: "2rem 0 3rem", maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Thanh toán MoMo (demo)</h1>
      <Suspense fallback={<SectionLoading fill label="Đang tải" />}>
        <MomoInner />
      </Suspense>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/products">← Quay lại mua sản phẩm</Link>
      </p>
    </div>
  );
}
