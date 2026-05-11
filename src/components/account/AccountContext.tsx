"use client";

import { createContext, useContext, useMemo } from "react";
import type { ShopSessionUser } from "@/components/session/ShopSessionProvider";
import { useShopSession } from "@/components/session/ShopSessionProvider";

export type AccountUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  linkedGoogle: boolean;
  hasPassword: boolean;
};

type Ctx = {
  me: AccountUser | null | undefined;
  refresh: () => Promise<void>;
};

const AccountCtx = createContext<Ctx | null>(null);

function mapSession(u: ShopSessionUser): AccountUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    linkedGoogle: u.linkedGoogle,
    hasPassword: u.hasPassword,
  };
}

/** Dùng session shop đã fetch — không gọi /api/auth/me lần hai. */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { status, user, refresh } = useShopSession();

  const me = useMemo<AccountUser | null | undefined>(() => {
    if (status === "loading") return undefined;
    return user ? mapSession(user) : null;
  }, [status, user]);

  const value = useMemo(
    () => ({ me, refresh: () => refresh(true) }),
    [me, refresh],
  );

  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export function useAccount() {
  const v = useContext(AccountCtx);
  if (!v) throw new Error("useAccount outside AccountProvider");
  return v;
}
