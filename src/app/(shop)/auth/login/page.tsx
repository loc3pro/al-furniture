"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { dispatchSessionRefresh } from "@/lib/session-cache-events";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { Spinner } from "@/components/ui/Spinner";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/";
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const identifier = String(fd.get("identifier") ?? "");
    const password = String(fd.get("password") ?? "");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Đăng nhập thất bại");
      setLoading(false);
      return;
    }
    dispatchSessionRefresh();
    router.replace(next);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="container" style={{ padding: "3rem 0", maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Đăng nhập</h1>
      <p className="muted">
        Chưa có tài khoản? <Link href="/auth/register">Đăng ký</Link>
      </p>
      <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }}>
        <div className="field">
          <label htmlFor="identifier">Email hoặc SĐT</label>
          <input id="identifier" name="identifier" required autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? <Spinner size="sm" inheritColor label="Đang đăng nhập" /> : "Đăng nhập"}
        </button>
      </form>
      <div style={{ marginTop: "1.5rem" }}>
        <GoogleSignIn redirectTo={next} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "3rem 0" }}>
          <SectionLoading fill label="Đang tải" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
