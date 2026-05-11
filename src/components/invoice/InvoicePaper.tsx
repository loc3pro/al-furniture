import { formatVnd } from "@/lib/money";
import type { InvoiceViewModel } from "@/lib/invoice-view-model";
import styles from "./invoice-document.module.scss";

/** Khối hóa đơn (giấy) — dùng trong trang in đơn lẻ và in nhiều đơn. */
export function InvoicePaper({ vm }: { vm: InvoiceViewModel }) {
  const dateStr = vm.issuedAt.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className={styles.invoice}>
      <header className={styles.invoiceHeader}>
        <div className={styles.brand}>
          <p className={styles.docKind}>Hóa đơn bán hàng</p>
          <h1 className={styles.brandName}>{vm.storeName}</h1>
        </div>
        <div className={styles.metaCol}>
          <div>
            Số đơn: <span className={styles.metaStrong}>{vm.orderNumber}</span>
          </div>
          <div>Ngày đặt: {dateStr}</div>
          <div>Trạng thái: {vm.statusLabel}</div>
        </div>
      </header>

      <div className={styles.grid2}>
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Người mua</h2>
          <p className={styles.blockBody}>
            {[vm.buyerName, vm.buyerPhone, vm.buyerEmail].filter(Boolean).join("\n") || "—"}
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Thanh toán</h2>
          <p className={styles.blockBody}>
            {vm.paymentLabel}
            {"\n"}
            {vm.payModeLabel}
            {"\n"}
            Tổng: {formatVnd(vm.totalAmount)}
            {vm.payModeLabel === "Đặt cọc" && vm.depositDue != null ? (
              <>
                {"\n"}
                Cọc: {formatVnd(vm.depositDue)}
                {vm.balanceDue != null ? ` · Còn lại: ${formatVnd(vm.balanceDue)}` : ""}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className={styles.block} style={{ marginBottom: "1rem" }}>
        <h2 className={styles.blockTitle}>Giao hàng</h2>
        <p className={styles.blockBody}>{vm.shippingBlock}</p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              {vm.audience === "admin" ? <th>SKU</th> : null}
              <th className={styles.colNum}>SL</th>
              <th className={styles.colNum}>Đơn giá</th>
              <th className={styles.colNum}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {vm.lines.map((line, i) => (
              <tr key={i}>
                <td>
                  <span className={styles.lineName}>{line.name}</span>
                  {line.variantLabel ? <span className={styles.variantHint}>{line.variantLabel}</span> : null}
                </td>
                {vm.audience === "admin" ? <td className={styles.sku}>{line.sku ?? "—"}</td> : null}
                <td className={styles.colNum}>{line.quantity}</td>
                <td className={styles.colNum}>{formatVnd(line.unitPrice)}</td>
                <td className={styles.colNum}>{formatVnd(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className={styles.totals}>
        <div className={styles.totalRow}>
          <dt>Tổng cộng</dt>
          <dd className={styles.grand}>{formatVnd(vm.totalAmount)}</dd>
        </div>
      </dl>

      <p className={styles.footerNote}>
        Bản in / PDF mang tính tham khảo giao dịch. Đối chiếu đơn hàng trên hệ thống để xác nhận cuối cùng. Mọi thắc mắc liên hệ cửa
        hàng qua hotline hoặc email hỗ trợ.
      </p>
    </article>
  );
}
