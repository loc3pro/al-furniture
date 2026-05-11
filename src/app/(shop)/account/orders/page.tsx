import { AccountOrdersClient } from "./AccountOrdersClient";
import styles from "../accountPages.module.scss";

export default function AccountOrdersPage() {
  return (
    <>
      <h1 className={styles.title}>Lịch sử đơn hàng</h1>
      <AccountOrdersClient />
    </>
  );
}
