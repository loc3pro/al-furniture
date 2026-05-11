"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatVnd } from "@/lib/money";
import { Spinner } from "@/components/ui/Spinner";
import { useShopSession } from "@/components/session/ShopSessionProvider";
import { OPEN_CHAT_EVENT } from "@/lib/chat-constants";
import { showAppToast } from "@/lib/app-toast";
import styles from "./checkout-done.module.scss";

type BankRow = {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branch: string | null;
  note: string | null;
  qrCodeUrl: string | null;
};

const NOTIFY_LS_PREFIX = "furniture_transfer_notify_";

export function CheckoutDoneBody() {
  const { user: sessionUser, status: sessionStatus } = useShopSession();
  const sp = useSearchParams();
  const id = sp.get("id");
  const orderNo = sp.get("orderNo");
  const pay = sp.get("pay");
  const negotiated = sp.get("negotiated") === "1";
  const amtRaw = sp.get("amt");
  const amt = amtRaw != null && amtRaw !== "" ? Number(amtRaw) : NaN;

  const [banks, setBanks] = useState<BankRow[] | null>(null);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifyLocked, setNotifyLocked] = useState(false);
  const [qrLightboxUrl, setQrLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!qrLightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrLightboxUrl]);

  useEffect(() => {
    if (pay !== "bank") return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/public/bank-accounts");
        const d = await r.json().catch(() => ({}));
        if (!cancelled && Array.isArray(d.accounts)) setBanks(d.accounts);
      } catch {
        if (!cancelled) setBanks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pay]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const phone = sessionUser?.phone?.trim();
    if (phone) setNotifyPhone(phone);
  }, [sessionStatus, sessionUser?.phone]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(`${NOTIFY_LS_PREFIX}${id}`) === "1") setNotifyLocked(true);
    } catch {
      /* ignore */
    }
  }, [id]);

  const notifyAdmin = useCallback(async () => {
    if (!id?.trim()) return;
    const phone = notifyPhone.trim();
    if (phone.length < 8) {
      const m = "Nhập số điện thoại đã dùng khi đặt hàng.";
      setNotifyMsg(m);
      showAppToast(m, "error");
      return;
    }
    setNotifyBusy(true);
    setNotifyMsg(null);
    try {
      const res = await fetch("/api/orders/notify-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          orderId: id,
          phone,
          ...(Number.isFinite(amt) && amt > 0 ? { amountHint: Math.round(amt) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const m = typeof data.error === "string" ? data.error : "Không gửi được.";
        setNotifyMsg(m);
        showAppToast(m, "error");
        return;
      }
      try {
        localStorage.setItem(`${NOTIFY_LS_PREFIX}${id}`, "1");
      } catch {
        /* ignore */
      }
      setNotifyLocked(true);
      setNotifyMsg("Đã gửi thông báo tới cửa hàng (chat). Admin sẽ đối soát sớm.");
      showAppToast("Đã gửi thông báo tới cửa hàng.");
    } catch {
      setNotifyMsg("Lỗi mạng.");
      showAppToast("Lỗi mạng.", "error");
    } finally {
      setNotifyBusy(false);
    }
  }, [id, notifyPhone, amt]);

  const showBank = pay === "bank";
  const amountOk = Number.isFinite(amt) && amt > 0;

  return (
    <div className={`container ${styles.wrap}`}>
      {qrLightboxUrl ? (
        <div className={styles.qrLightbox} role="presentation" onClick={() => setQrLightboxUrl(null)}>
          <div
            className={styles.qrLightboxInner}
            role="dialog"
            aria-modal
            aria-label="Mã QR chuyển khoản"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrLightboxUrl}
              alt="Mã QR chuyển khoản"
              className={styles.qrLightboxImg}
              decoding="async"
              fetchPriority="high"
            />
            <button type="button" className={`btn btn--ghost ${styles.qrLightboxClose}`} onClick={() => setQrLightboxUrl(null)}>
              Đóng
            </button>
          </div>
        </div>
      ) : null}
      <h1 className={styles.title}>Đặt hàng thành công</h1>
      <p className="muted">
        Mã đơn: <strong>{orderNo?.trim() || id?.trim() || "—"}</strong>
      </p>

      {showBank ? (
        <div className={styles.bankCard}>
          <div className={styles.chatFirst}>
            <p>
              <strong>Chuyển khoản:</strong> sau khi chuyển, vui lòng dùng chat Hỗ trợ để gửi biên lai và trao đổi với
              cửa hàng.
            </p>
            <button
              type="button"
              className={styles.openChatBtn}
              onClick={() => {
                window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
              }}
            >
              Mở chat Hỗ trợ
            </button>
          </div>
          {negotiated ? (
            <p className={styles.negotiateNote}>
              Bạn đã chọn <strong>cọc thỏa thuận</strong> — nhắn admin trong chat để thống nhất số tiền / kế hoạch thanh
              toán còn lại.
            </p>
          ) : null}
          <p className={styles.bankLead}>
            Vui lòng chuyển khoản{" "}
            <strong>
              {amountOk ? formatVnd(amt) : "đúng số tiền (xem email/tin nhắn nếu cần)"}
            </strong>
            . Nội dung chuyển khoản ghi <strong>mã đơn</strong> và số điện thoại đặt hàng để cửa hàng đối soát nhanh.
          </p>
          {banks === null ? (
            <Spinner size="md" label="Đang tải thông tin tài khoản" />
          ) : banks.length === 0 ? (
            <p className={styles.warn}>Chưa cấu hình tài khoản ngân hàng — shop sẽ gửi STK qua tin nhắn hoặc email.</p>
          ) : (
            <ul className={styles.bankList}>
              {banks.map((b) => (
                <li key={b.id}>
                  <div className={styles.bankName}>
                    {b.bankName}
                    {b.branch ? ` · ${b.branch}` : ""}
                  </div>
                  <div className={styles.bankAcctLine}>
                    chủ tk: {b.accountHolder} - STK: {b.accountNumber}
                  </div>
                  {b.note ? <p className={styles.bankNote}>{b.note}</p> : null}
                  {b.qrCodeUrl ? (
                    <button
                      type="button"
                      className={`btn btn--primary ${styles.bankQrBtn}`}
                      onClick={() => setQrLightboxUrl(b.qrCodeUrl)}
                    >
                      Lấy mã QR
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className={styles.notifyCard}>
            <p className={styles.notifyLead}>
              Sau khi đã chuyển khoản thành công, bấm nút để <strong>thông báo shop đối soát</strong> (tin nhắn gửi vào kênh chat hỗ trợ).
            </p>
            <label className={styles.notifyLabel}>
              SĐT trên đơn (để xác minh)
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
                placeholder="VD: 0981074090"
                className={styles.notifyInput}
                disabled={notifyLocked}
              />
            </label>
            <button
              type="button"
              className={`btn btn--primary ${styles.notifyBtn}`}
              disabled={notifyBusy || notifyLocked}
              onClick={() => void notifyAdmin()}
            >
              {notifyLocked
                ? "Đã gửi thông báo"
                : notifyBusy
                  ? (
                      <Spinner size="sm" inheritColor label="Đang gửi" />
                    )
                  : "Đã chuyển khoản — thông báo admin"}
            </button>
            {notifyMsg ? <p className={styles.notifyFeedback}>{notifyMsg}</p> : null}
          </div>
        </div>
      ) : (
        <p>Chúng tôi sẽ liên hệ xác nhận đơn hàng. Cảm ơn bạn đã mua sắm.</p>
      )}

      <p>
        <Link href="/products" className="btn btn--primary" style={{ display: "inline-flex", marginTop: "0.5rem" }}>
          Tiếp tục mua sắm
        </Link>
      </p>
    </div>
  );
}
