import Link from "next/link";
import { AccountOrderDetailClient } from "./AccountOrderDetailClient";
import styles from "../../accountPages.module.scss";

export default function AccountOrderDetailPage() {
  return (
    <>
      <p className={styles.orderDetailBack}>
        <Link href="/account/orders">← Lịch sử đơn hàng</Link>
      </p>
      <AccountOrderDetailClient />
    </>
  );
}
