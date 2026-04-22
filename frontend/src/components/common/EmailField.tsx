"use client";
import { useEffect, useRef, useState } from "react";
import { EMAIL_REGEX } from "@/lib/validation";

interface EmailFieldProps {
  value: string;
  onChange: (v: string) => void;
  onAvailableChange?: (available: boolean) => void;
}

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export default function EmailField({ value, onChange, onAvailableChange }: EmailFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!value) { setStatus("idle"); setMessage(""); onAvailableChange?.(false); return; }
    if (!EMAIL_REGEX.test(value)) {
      setStatus("invalid");
      setMessage("올바른 이메일 형식이 아닙니다.");
      onAvailableChange?.(false);
      return;
    }
    setStatus("checking");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(value)}`);
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
        setMessage(data.message);
        onAvailableChange?.(data.available);
      } catch {
        setStatus("idle");
        onAvailableChange?.(false);
      }
    }, 500);
  }, [value]);

  const borderColor =
    status === "available" ? "border-emerald-300" :
    status === "taken" || status === "invalid" ? "border-red-300" : "";

  return (
    <div>
      <div className="relative">
        <input
          type="email" required autoComplete="email"
          className={`input-base pr-8 ${borderColor}`}
          placeholder="example@email.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
          {status === "checking" && (
            <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin inline-block" />
          )}
        </div>
      </div>
      {message && (
        <p className={`text-xs mt-1.5 flex items-center gap-1
          ${status === "available" ? "text-emerald-600" : "text-red-500"}`}>
          <span>{status === "available" ? "✓" : "✕"}</span>
          {message}
        </p>
      )}
    </div>
  );
}
