"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let addToastExternal: ((toast: Omit<Toast, "id">) => void) | null = null;

export function toast(message: string, type: ToastType = "info", duration = 4000) {
  addToastExternal?.({ message, type, duration });
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => removeToast(id), toast.duration ?? 4000);
  }, [removeToast]);

  useEffect(() => {
    addToastExternal = addToast;
    return () => { addToastExternal = null; };
  }, [addToast]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} color="#10b981" />,
    error: <AlertCircle size={18} color="#ef4444" />,
    info: <Info size={18} color="#6366f1" />,
    warning: <AlertTriangle size={18} color="#f59e0b" />,
  };

  const colors: Record<ToastType, string> = {
    success: "rgba(16,185,129,0.15)",
    error: "rgba(239,68,68,0.15)",
    info: "rgba(99,102,241,0.15)",
    warning: "rgba(245,158,11,0.15)",
  };

  const borders: Record<ToastType, string> = {
    success: "rgba(16,185,129,0.3)",
    error: "rgba(239,68,68,0.3)",
    info: "rgba(99,102,241,0.3)",
    warning: "rgba(245,158,11,0.3)",
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-in-right flex items-start gap-3"
          style={{
            background: "rgba(13,13,24,0.97)",
            border: `1px solid ${borders[t.type]}`,
            borderLeft: `3px solid ${borders[t.type]}`,
            borderRadius: "14px",
            padding: "14px 16px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            minWidth: "300px",
            maxWidth: "400px",
            backgroundColor: colors[t.type],
          }}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", flex: 1, lineHeight: "1.4" }}>
            {t.message}
          </p>
          <button
            onClick={() => removeToast(t.id)}
            style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
