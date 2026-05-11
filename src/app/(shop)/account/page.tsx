"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountAvatarUpload } from "@/components/account/AccountAvatarUpload";
import { useAccount } from "@/components/account/AccountContext";
import { uploadAccountImageFile } from "@/lib/account-upload-client";
import { Spinner } from "@/components/ui/Spinner";
import { showAppToast } from "@/lib/app-toast";
import styles from "./accountPages.module.scss";

export default function AccountProfilePage() {
  const { me, refresh } = useAccount();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);

  const profileDirty = useMemo(() => {
    if (!me) return false;
    const emailChanged =
      !me.linkedGoogle && email.trim().toLowerCase() !== (me.email ?? "").trim().toLowerCase();
    return (
      pendingAvatarFile != null ||
      name.trim() !== (me.name ?? "").trim() ||
      phone.trim() !== (me.phone ?? "").trim() ||
      emailChanged
    );
  }, [me, name, phone, email, pendingAvatarFile]);

  const passwordDirty = pwCur.length > 0 || pwNew.length > 0 || pwNew2.length > 0;

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setPhone(me.phone ?? "");
    setEmail(me.email ?? "");
  }, [me]);

  async function deleteAccountCloudinaryImage(url: string) {
    await fetch("/api/account/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      credentials: "same-origin",
    });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setSavingProfile(true);
    const stagedUploadUrls: string[] = [];
    try {
      let avatarForPayload = me.avatarUrl ?? "";
      if (pendingAvatarFile) {
        const url = await uploadAccountImageFile(pendingAvatarFile);
        stagedUploadUrls.push(url);
        avatarForPayload = url;
      }

      const payload: Record<string, string> = {};
      if (name.trim()) payload.name = name.trim();
      payload.phone = phone.trim();
      if (!me.linkedGoogle && email.trim()) payload.email = email.trim().toLowerCase();
      payload.avatarUrl = avatarForPayload.trim();

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        for (const u of stagedUploadUrls) {
          await deleteAccountCloudinaryImage(u);
        }
        setPendingAvatarFile(null);
        showAppToast(data.error ?? "Lưu thất bại", "error");
        return;
      }
      setPendingAvatarFile(null);
      showAppToast("Đã cập nhật hồ sơ.");
      await refresh();
    } catch (err) {
      for (const u of stagedUploadUrls) {
        await deleteAccountCloudinaryImage(u);
      }
      setPendingAvatarFile(null);
      showAppToast(err instanceof Error ? err.message : "Lưu thất bại", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew !== pwNew2) {
      showAppToast("Mật khẩu mới nhập lại không khớp.", "error");
      return;
    }
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: pwCur,
        newPassword: pwNew,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAppToast(data.error ?? "Đổi mật khẩu thất bại", "error");
      return;
    }
    showAppToast("Đã đổi mật khẩu.");
    setPwCur("");
    setPwNew("");
    setPwNew2("");
  }

  if (!me) return null;

  return (
    <>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/" className="muted">
          ← Về trang chủ
        </Link>
      </p>
      <h1 className={styles.title}>Thông tin cá nhân</h1>

      <section className={styles.card}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Chỉnh sửa hồ sơ</h2>
        {me.linkedGoogle ? (
          <p className={styles.muted} style={{ marginBottom: "1rem" }}>
            Bạn đăng nhập bằng Google/One Tap — email do Google quản lý, không đổi tại đây.
          </p>
        ) : null}
        <form onSubmit={(e) => void saveProfile(e)}>
          <label className={styles.field}>
            Họ tên
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={savingProfile}
            />
          </label>
          <label className={styles.field}>
            Số điện thoại
            <input
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={savingProfile}
            />
          </label>
          <label className={styles.field}>
            Email
            <input
              className={styles.input}
              style={{ opacity: me.linkedGoogle ? 0.75 : 1 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={me.linkedGoogle || savingProfile}
              readOnly={me.linkedGoogle}
            />
          </label>
          <div style={{ marginBottom: "0.75rem" }}>
            <AccountAvatarUpload
              savedUrl={me.avatarUrl ?? ""}
              pendingFile={pendingAvatarFile}
              onPickFile={setPendingAvatarFile}
              disabled={savingProfile}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={savingProfile || !profileDirty}>
            {savingProfile ? <Spinner size="sm" inheritColor label="Đang lưu hồ sơ" /> : "Lưu hồ sơ"}
          </button>
        </form>
      </section>

      {me.hasPassword ? (
        <section className={styles.card}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Đổi mật khẩu</h2>
          <form onSubmit={changePassword}>
            <label className={styles.field}>
              Mật khẩu hiện tại
              <input
                type="password"
                className={styles.input}
                value={pwCur}
                onChange={(e) => setPwCur(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className={styles.field}>
              Mật khẩu mới
              <input
                type="password"
                className={styles.input}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              Nhập lại mật khẩu mới
              <input
                type="password"
                className={styles.input}
                value={pwNew2}
                onChange={(e) => setPwNew2(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={!passwordDirty}>
              Đổi mật khẩu
            </button>
          </form>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>Mật khẩu</h2>
          <p className={styles.muted} style={{ margin: 0 }}>
            Tài khoản chỉ đăng nhập Google — không có mật khẩu cục bộ.
          </p>
        </section>
      )}
    </>
  );
}
