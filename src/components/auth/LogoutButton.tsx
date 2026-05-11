"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  className?: string;
  /** Sau khi logout (mặc định `/`) */
  redirectTo?: string;
  children?: ReactNode;
  /** Bỏ style mặc định dạng link — dùng className (ví dụ nút trong drawer) */
  unstyled?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "onClick">;

export function LogoutButton({ className, redirectTo = "/", children, unstyled, ...rest }: Props) {
  return (
    <button
      type="button"
      className={className}
      {...rest}
      style={
        unstyled
          ? { cursor: "pointer" }
          : {
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }
      }
      onClick={async () => {
        try {
          const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
          if (!res.ok) throw new Error("logout failed");
        } catch {
          // Still navigate so UI resets even if response fails
        }
        window.location.assign(redirectTo);
      }}
    >
      {children ?? "Đăng xuất"}
    </button>
  );
}
