"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const ADMIN_UI_DARK_STORAGE_KEY = "admin-ui-dark";
export const ADMIN_UI_DENSITY_STORAGE_KEY = "admin-ui-density";
export const ADMIN_UI_MOTION_STORAGE_KEY = "admin-ui-motion-reduced";

export type AdminDensity = "comfortable" | "compact";

type Ctx = {
  dark: boolean;
  setDark: (next: boolean) => void;
  toggleDark: () => void;
  ready: boolean;
  density: AdminDensity;
  setDensity: (next: AdminDensity) => void;
  motionReduced: boolean;
  setMotionReduced: (next: boolean) => void;
};

const AdminAppearanceContext = createContext<Ctx | null>(null);

function dispatchAppearanceChanged() {
  try {
    window.dispatchEvent(new CustomEvent("furniture-admin-appearance"));
  } catch {
    /* ignore */
  }
}

function readDarkFromStorage(): boolean {
  try {
    return localStorage.getItem(ADMIN_UI_DARK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readDensityFromStorage(): AdminDensity {
  try {
    return localStorage.getItem(ADMIN_UI_DENSITY_STORAGE_KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

/** `null` = chưa có trong storage — dùng gợi ý từ hệ thống (prefers-reduced-motion) */
function readMotionFlagFromStorage(): boolean | null {
  try {
    const v = localStorage.getItem(ADMIN_UI_MOTION_STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function persistDark(next: boolean) {
  try {
    localStorage.setItem(ADMIN_UI_DARK_STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  dispatchAppearanceChanged();
}

function persistDensity(next: AdminDensity) {
  try {
    localStorage.setItem(ADMIN_UI_DENSITY_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  dispatchAppearanceChanged();
}

function persistMotionReduced(next: boolean) {
  try {
    localStorage.setItem(ADMIN_UI_MOTION_STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  dispatchAppearanceChanged();
}

function syncAllFromStorage(): {
  dark: boolean;
  density: AdminDensity;
  motionReduced: boolean;
} {
  const motionStored = readMotionFlagFromStorage();
  let motionReduced = motionStored === true;
  if (motionStored === null) {
    try {
      motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      motionReduced = false;
    }
  }
  return {
    dark: readDarkFromStorage(),
    density: readDensityFromStorage(),
    motionReduced,
  };
}

export function AdminAppearanceProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const [density, setDensityState] = useState<AdminDensity>("comfortable");
  const [motionReduced, setMotionReducedState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { dark: d, density: den, motionReduced: m } = syncAllFromStorage();
    setDarkState(d);
    setDensityState(den);
    setMotionReducedState(m);
    setReady(true);
  }, []);

  const setDark = useCallback((next: boolean) => {
    setDarkState(next);
    persistDark(next);
  }, []);

  const toggleDark = useCallback(() => {
    setDarkState((prev) => {
      const next = !prev;
      persistDark(next);
      return next;
    });
  }, []);

  const setDensity = useCallback((next: AdminDensity) => {
    setDensityState(next);
    persistDensity(next);
  }, []);

  const setMotionReduced = useCallback((next: boolean) => {
    setMotionReducedState(next);
    persistMotionReduced(next);
  }, []);

  useEffect(() => {
    const sync = () => {
      const { dark: d, density: den, motionReduced: m } = syncAllFromStorage();
      setDarkState(d);
      setDensityState(den);
      setMotionReducedState(m);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("furniture-admin-appearance", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("furniture-admin-appearance", sync as EventListener);
    };
  }, []);

  const value = useMemo(
    () => ({
      dark,
      setDark,
      toggleDark,
      ready,
      density,
      setDensity,
      motionReduced,
      setMotionReduced,
    }),
    [dark, density, motionReduced, ready, setDark, setDensity, setMotionReduced, toggleDark],
  );

  return <AdminAppearanceContext.Provider value={value}>{children}</AdminAppearanceContext.Provider>;
}

export function useAdminAppearance(): Ctx {
  const v = useContext(AdminAppearanceContext);
  if (!v) {
    throw new Error("useAdminAppearance chỉ dùng trong AdminAppearanceProvider");
  }
  return v;
}
