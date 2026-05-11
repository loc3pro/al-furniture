import type { Metadata } from "next";
import Link from "next/link";
import { loadPublicRetailStoresForApi } from "@/lib/public-catalog-db";
import { toGoogleMapsEmbedSrc } from "@/lib/google-maps-embed";
import styles from "./showroom.module.scss";

export const metadata: Metadata = {
  title: "Showroom",
  description: "Địa chỉ và bản đồ các showroom — ghé thăm và trải nghiệm sản phẩm.",
};

export default async function ShowroomPage() {
  const stores = await loadPublicRetailStoresForApi();

  if (stores.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <header className={styles.head}>
          <h1 className={styles.title}>Showroom</h1>
          <p className={styles.lead}>Hiện chưa cập nhật địa chỉ showroom. Vui lòng quay lại sau hoặc liên hệ hotline.</p>
        </header>
        <p className={styles.empty}>
          <Link href="/products">Xem sản phẩm</Link>
        </p>
      </div>
    );
  }

  const primary = stores.find((s) => s.isDefault) ?? stores[0]!;
  const others = stores.filter((s) => s.id !== primary.id);
  const mapSrc = toGoogleMapsEmbedSrc(primary.mapUrl, primary.address);

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Showroom</h1>
        <p className={styles.lead}>
          Ghé showroom để xem mẫu trực tiếp. Cửa hàng mặc định hiển thị bản đồ theo link Maps đã cấu hình (nếu có); các chi nhánh khác nằm trong danh sách bên dưới.
        </p>
      </header>

      <section className={styles.primaryCard} aria-labelledby="showroom-primary">
        <div className={styles.primaryBody}>
          <div className={styles.primaryInfo}>
            <span className={styles.primaryBadge}>Cửa hàng mặc định</span>
            <h2 id="showroom-primary" className={styles.primaryName}>
              {primary.name}
            </h2>
            <p className={styles.primaryAddr}>{primary.address}</p>
            <div className={styles.meta}>
              {primary.phone ? (
                <span>
                  Điện thoại:{" "}
                  <a href={`tel:${primary.phone.replace(/\s+/g, "")}`}>{primary.phone}</a>
                </span>
              ) : null}
              {primary.openingHours ? <span>Giờ mở cửa: {primary.openingHours}</span> : null}
              {primary.mapUrl ? (
                <a href={primary.mapUrl} target="_blank" rel="noopener noreferrer">
                  Mở trên Google Maps
                </a>
              ) : null}
            </div>
          </div>
          <div className={styles.mapWrap}>
            <iframe
              title={`Bản đồ — ${primary.name}`}
              className={styles.mapFrame}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="showroom-more">
          <h2 id="showroom-more" className={styles.sectionTitle}>
            Các chi nhánh khác
          </h2>
          <div className={styles.storeGrid}>
            {others.map((s) => (
              <article key={s.id} className={styles.storeCard}>
                <h3 className={styles.storeName}>{s.name}</h3>
                <p className={styles.storeAddr}>{s.address}</p>
                <div className={styles.storeLinks}>
                  {s.phone ? (
                    <a href={`tel:${s.phone.replace(/\s+/g, "")}`}>{s.phone}</a>
                  ) : null}
                  {s.mapUrl ? (
                    <a href={s.mapUrl} target="_blank" rel="noopener noreferrer">
                      Chỉ đường / Maps
                    </a>
                  ) : null}
                </div>
                {s.openingHours ? <p className={styles.storeHours}>{s.openingHours}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
