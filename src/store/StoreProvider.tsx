"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { hydrate } from "@/features/cart/cartSlice";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AppStore | null>(null);
  if (!ref.current) {
    ref.current = makeStore();
  }

  /** Đọc localStorage chỉ sau mount — trùng HTML SSR (giỏ rỗng) rồi mới đồng bộ, tránh hydration mismatch. */
  useEffect(() => {
    ref.current?.dispatch(hydrate());
  }, []);

  return <Provider store={ref.current}>{children}</Provider>;
}
