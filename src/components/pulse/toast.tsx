"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Styling maps                                                       */
/* ------------------------------------------------------------------ */

const borderColor: Record<ToastType, string> = {
  success: "border-l-brand-500",
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const iconGradient: Record<ToastType, string> = {
  success: "bg-gradient-to-br from-brand-500 to-cyan-500",
  error: "bg-gradient-to-br from-red-500 to-red-600",
  warning: "bg-gradient-to-br from-amber-500 to-red-500",
  info: "bg-gradient-to-br from-blue-500 to-cyan-500",
};

const iconChar: Record<ToastType, string> = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Single toast                                                       */
/* ------------------------------------------------------------------ */

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // trigger slide-in on next frame
    requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      setVisible(false);
      // wait for exit animation before removing
      setTimeout(() => onDismiss(item.id), 300);
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={[
        "flex items-start gap-3 min-w-[320px] rounded-xl border border-border bg-white p-4 shadow-lg",
        "border-l-4",
        borderColor[item.type],
        "transition-all duration-300 ease-out",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
      ].join(" ")}
    >
      {/* icon */}
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-white",
          iconGradient[item.type],
        ].join(" ")}
      >
        {iconChar[item.type]}
      </div>

      {/* text */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-text">{item.title}</span>
        {item.description && (
          <span className="text-xs text-muted">{item.description}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* toast container */}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast, type ToastType };
