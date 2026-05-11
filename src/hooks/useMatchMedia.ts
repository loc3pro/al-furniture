"use client";

import { useCallback, useSyncExternalStore } from "react";

/** `window.matchMedia` — subscribe đúng cách, ít frame chờ hơn `useState`+effect. */
export function useMatchMedia(query: string, defaultServerValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : defaultServerValue),
    () => defaultServerValue,
  );
}
