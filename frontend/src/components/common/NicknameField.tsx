"use client";

import { useEffect, useRef, useState } from "react";

interface NicknameFieldProps {
  value: string;
  onChange: (v: string) => void;
  excludeId?: string;
  onAvailableChange?: (available: boolean) => void;
}

type Status = "idle" | "checking" | "available" | "taken" | "error";

export default function NicknameField({ value, onChange, excludeId, onAvailableChange }: NicknameFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (!value || value.length < 2) {
      setStatus("idle");
      setMessage("");
      onAvailableChange?.(false);
      return;
    }

    setStatus("checking");
    timer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ nickname: value });
        if (excludeId) params.set("excludeId", excludeId);
        const res = await fetch(`/api/auth/check-nickname?${params}`);
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
        setMessage(data.message);
        onAvailableChange?.(data.available);
      } catch {
        setStatus("error");
        setMessage("중복 확인 중 오류가 발생했습니다.");
        onAvailableChange?.(false);
      }
    }, 500);
  }, [value, excludeId, onAvailableChange]);

  const borderColor =
    status === "available"
      ? "focus:border-emerald-400 focus:ring-emerald-100 border-emerald-300"
      : status === "taken"
        ? "focus:border-red-400 focus:ring-red-100 border-red-300"
        : "";

  return (
    <div>
      <div className="relative">
        <input
          className={`input-base pr-20 ${borderColor}`}
          placeholder="2~20자 닉네임"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={20}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
          {status === "checking" && (
            <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin inline-block" />
          )}
        </div>
      </div>
      {message && (
        <p className={`text-xs mt-1.5 flex items-center gap-1 ${status === "available" ? "text-emerald-600" : "text-red-500"}`}>
          <span>{status === "available" ? "✓" : "✕"}</span>
          {message}
        </p>
      )}
    </div>
  );
}
