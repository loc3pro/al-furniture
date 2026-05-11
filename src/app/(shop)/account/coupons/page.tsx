import { AccountCouponsClient } from "./AccountCouponsClient";
import styles from "../accountPages.module.scss";

export default function AccountCouponsPage() {
  return (
    <>
      <h1 className={styles.title}>Voucher & mã giảm giá</h1>
      <p className={styles.muted} style={{ marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
        Mã từ vòng quay may mắn — xem danh sách đang dùng được và lịch sử đã dùng / hết hạn.
      </p>
      <AccountCouponsClient />
    </>
  );
}
