import { useEffect, useState } from "react";

/** Độ trễ mặc định cho ô tìm kiếm gọi API (giảm số request khi gõ). */
export const SEARCH_API_DEBOUNCE_MS = 320;

/**
 * Giữ state hiển thị tức thì (input), trả về bản đã debounce cho `useEffect` / fetch.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_API_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
