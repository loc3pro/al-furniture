import { AccountReviewsClient } from "./AccountReviewsClient";
import styles from "../accountPages.module.scss";

export default function AccountReviewsPage() {
  return (
    <>
      <h1 className={styles.title}>Đánh giá đơn hàng</h1>
      <AccountReviewsClient />
    </>
  );
}
