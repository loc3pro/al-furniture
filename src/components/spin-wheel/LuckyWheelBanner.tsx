"use client";

import Link from "next/link";
import { Gift, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import styles from "./LuckyWheelBanner.module.scss";

const STORAGE_KEY = "furniture_spin_banner_hide_until";
const COOLDOWN_MS = 2 * 60 * 1000;
const SCROLL_THRESHOLD_PX = 120;

function readHideUntil(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function scrollTop(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function LuckyWheelBanner() {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("Vòng quay may mắn");
  const [hideUntil, setHideUntil] = useState(0);
  const [cooldownEndedVersion, setCooldownEndedVersion] = useState(0);

  useEffect(() => {
    setHideUntil(readHideUntil());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/public/spin-wheel");
        const d = (await r.json()) as { bannerTitle?: string };
        if (cancelled) return;
        if (typeof d.bannerTitle === "string" && d.bannerTitle.trim()) {
          setTitle(d.bannerTitle.trim());
        }
      } catch {
        /* giữ title mặc định */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inCooldown = hideUntil > 0 && Date.now() < hideUntil;

  useEffect(() => {
    if (!hideUntil || Date.now() >= hideUntil) return;
    const ms = Math.max(0, hideUntil - Date.now()) + 50;
    const id = window.setTimeout(() => setCooldownEndedVersion((n) => n + 1), ms);
    return () => window.clearTimeout(id);
  }, [hideUntil]);

  useEffect(() => {
    if (inCooldown) return;
    if (scrollTop() > SCROLL_THRESHOLD_PX) setShow(true);
  }, [inCooldown, cooldownEndedVersion]);

  useEffect(() => {
    const onScroll = () => {
      setShow(scrollTop() > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClose = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const until = Date.now() + COOLDOWN_MS;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(until));
    } catch {
      /* ignore */
    }
    setHideUntil(until);
    setShow(false);
  }, []);

  if (!show || inCooldown) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <Link href="/lucky-wheel" className={styles.bannerLink} aria-label="Mở trang vòng quay — voucher">
          <span className={styles.ring} aria-hidden />
          <Gift className={styles.icon} size={28} strokeWidth={2} aria-hidden />
          <span className={styles.couponTag} aria-hidden>
            Voucher
          </span>
          <span className={styles.text}>{title}</span>
        </Link>
        <button
          type="button"
          className={styles.close}
          onClick={handleClose}
          aria-label="Đóng banner (hiển thị lại sau 2 phút)"
        >
          <X size={20} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
