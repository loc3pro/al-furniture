import { ShopHomeSkeleton } from "@/components/shop/ShopRouteSkeleton";
import styles from "./PageLoadingFallback.module.scss";

type Variant = "shop" | "admin";

/** Route loading: thanh progress + (shop) skeleton full section để không trống giữa header/footer. */
export function PageLoadingFallback({ variant = "shop" }: { variant?: Variant }) {
  return (
    <div className={styles.wrap} data-variant={variant} aria-busy="true">
      <span className="visually-hidden">Đang tải trang</span>
      <div className={styles.rail} aria-hidden>
        <div className={styles.bar} />
      </div>
      {variant === "shop" ? <ShopHomeSkeleton /> : null}
    </div>
  );
}
