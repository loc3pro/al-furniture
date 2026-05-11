import Link from "next/link";

export default function ComparePage() {
  return (
    <div className="container" style={{ padding: "2rem 0 3rem", maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.5rem" }}>So sánh sản phẩm</h1>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Bộ so sánh đang được hoàn thiện. Hiện bạn có thể lưu sản phẩm qua <Link href="/wishlist">yêu thích</Link>{" "}
        hoặc thêm vào <Link href="/cart">giỏ hàng</Link>.
      </p>
      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/products" className="btn btn--primary">
          Xem sản phẩm
        </Link>
      </p>
    </div>
  );
}
