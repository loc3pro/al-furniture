"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./FloatingRail.module.scss";

const MESSENGER_URL =
  process.env.NEXT_PUBLIC_MESSENGER_URL ?? "https://m.me";
const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL ?? "https://zalo.me";
const ENV_HOTLINE_TEL = process.env.NEXT_PUBLIC_HOTLINE_TEL ?? "0931799744";

type FloatingRailProps = {
  /** Chỉ chữ số; ưu tiên theme admin, không có thì dùng env. */
  hotlineDigits?: string;
  /** Chuỗi hiển thị sau «Gọi »; mặc định env. */
  hotlineDisplay?: string;
};

/** Ảnh trong public/icon — thay file giữ nguyên tên. URL từ .env. Thứ tự: gọi → Zalo → Messenger (mobile FAB). */
export function FloatingRail({ hotlineDigits, hotlineDisplay }: FloatingRailProps = {}) {
  const telDigits = (hotlineDigits?.replace(/\D/g, "") || ENV_HOTLINE_TEL.replace(/\s/g, "")) || "0931799744";
  const display = (hotlineDisplay?.trim() || ENV_HOTLINE_TEL).trim();

  const LINKS = [
    {
      key: "phone" as const,
      href: `tel:${telDigits}`,
      label: `Gọi ${display}`,
      icon: "/icon/phone.jpg",
      external: false,
    },
    {
      key: "zalo" as const,
      href: ZALO_URL,
      label: "Mở Zalo chat",
      icon: "/icon/zalo.jpg",
      external: true,
    },
    {
      key: "messenger" as const,
      href: MESSENGER_URL,
      label: "Mở Messenger",
      icon: "/icon/messenger.jpg",
      external: true,
    },
  ];
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <aside className={styles.rail} aria-label="Liên hệ nhanh">
      <nav className={styles.card} aria-label="Gọi điện, Zalo, Messenger">
        <ul className={styles.list}>
          {LINKS.map((l) => (
            <li key={l.key} className={styles.item}>
              <a
                href={l.href}
                className={styles.chip}
                data-channel={l.key}
                aria-label={l.label}
                {...(l.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {/* Label trước icon: khi hẹp + justify-end → icon luôn bám phải */}
                <span className={styles.chipLabel}>{l.label}</span>
                <Image
                  src={l.icon}
                  alt=""
                  width={28}
                  height={28}
                  className={styles.chipIcon}
                  sizes="28px"
                  loading="lazy"
                />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {showTop ? (
        <button
          type="button"
          className={styles.topBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className={styles.topArrow}>↑</span>
          <span className={styles.topText}>TOP</span>
        </button>
      ) : null}
    </aside>
  );
}
