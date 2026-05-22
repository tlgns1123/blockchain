"use client";

import { useEffect, useState } from "react";
import { setToastListener, type ToastType } from "@/lib/toast";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const STYLE: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", icon: "✅", color: "#34d399" },
  error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  icon: "❌", color: "#f87171" },
  info:    { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)", icon: "🔔", color: "#c4b5fd" },
};

let nextId = 1;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToastListener((message, type) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const s = STYLE[t.type];
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm max-w-xs shadow-xl"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              backdropFilter: "blur(12px)",
              color: s.color,
              animation: "fadeInUp 0.25s ease",
            }}
          >
            <span className="flex-shrink-0 text-base">{s.icon}</span>
            <span style={{ color: "#f0f0f8" }}>{t.message}</span>
          </div>
        );
      })}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
