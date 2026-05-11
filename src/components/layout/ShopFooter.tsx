import Link from "next/link";
import styles from "./ShopFooter.module.scss";

export function ShopFooter({ footerNote }: { footerNote: string | null }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.col}>
          <div className={styles.brand}>Furniture ECM</div>
          <p className={styles.lead}>
            {footerNote ??
              "Nội thất tối giản — giao hàng toàn quốc, tư vấn miễn phí."}
          </p>
          <p className={styles.contact}>
            <a href="tel:0931799744">0931 799 744</a>
            <br />
            <a href="mailto:sale@furniture-ecm.local">sale@furniture-ecm.local</a>
            <br />
            <span className={styles.muted}>08:30 — 20:30 · Cả tuần</span>
          </p>
        </div>
        <nav className={styles.col} aria-label="Điều hướng">
          <div className={styles.colTitle}>Liên kết</div>
          <Link href="/products">Tìm kiếm / Sản phẩm</Link>
          <Link href="/shop-the-look">Shop the Look</Link>
          <Link href="/showroom">Showroom</Link>
          <Link href="/blog">Tin tức</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/cart">Giỏ hàng</Link>
          <Link href="/auth/login">Tài khoản</Link>
        </nav>
        <nav className={styles.col} aria-label="Chính sách">
          <div className={styles.colTitle}>Chính sách</div>
          <span className={styles.fakeLink}>Đổi trả</span>
          <span className={styles.fakeLink}>Bảo mật</span>
          <span className={styles.fakeLink}>Vận chuyển</span>
          <span className={styles.fakeLink}>Thanh toán</span>
        </nav>
      </div>
      <div className={styles.strip}>
        <div className={`container ${styles.stripInner}`}>
          <span>© {new Date().getFullYear()} Furniture ECM — Demo storefront</span>
          <span className={styles.pay}>COD · MoMo · Chuyển khoản</span>
        </div>
      </div>
    </footer>
  );
}
