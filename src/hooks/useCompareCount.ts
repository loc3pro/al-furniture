"use client";

import { useEffect, useState } from "react";

const KEY = "furniture_compare_ids";

function readCount() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

export function useCompareCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(readCount());
    const on = () => setN(readCount());
    window.addEventListener("storage", on);
    window.addEventListener("furniture_compare", on as EventListener);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("furniture_compare", on as EventListener);
    };
  }, []);
  return n;
}
