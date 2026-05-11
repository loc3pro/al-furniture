"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { Spinner } from "@/components/ui/Spinner";
import { dispatchSessionRefresh } from "@/lib/session-cache-events";

export default function RegisterPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const identifier = String(fd.get("identifier") ?? "");
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, name: name || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Không đăng ký được");
      setLoading(false);
      return;
    }
    dispatchSessionRefresh();
    router.replace("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="container" style={{ padding: "3rem 0", maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Đăng ký</h1>
      <p className="muted">
        Đã có tài khoản? <Link href="/auth/login">Đăng nhập</Link>
      </p>
      <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }}>
        <div className="field">
          <label htmlFor="name">Họ tên (tuỳ chọn)</label>
          <input id="name" name="name" autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="identifier">Email hoặc SĐT</label>
          <input id="identifier" name="identifier" required autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu (tối thiểu 6 ký tự)</label>
          <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? <Spinner size="sm" inheritColor label="Đang tạo tài khoản" /> : "Tạo tài khoản"}
        </button>
      </form>
      <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
        OTP SMS / xác nhận email có thể bổ sung trong phase tiếp theo — hiện dùng mật khẩu.
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <GoogleSignIn />
      </div>
    </div>
  );
}
