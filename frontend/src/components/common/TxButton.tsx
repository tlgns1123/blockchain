"use client";

import { ButtonHTMLAttributes } from "react";

interface TxButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label: string;
  variant?: "primary" | "secondary";
}

export default function TxButton({
  loading,
  label,
  disabled,
  variant = "primary",
  ...props
}: TxButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} flex items-center justify-center gap-2 ${props.className ?? ""}`}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {loading ? "처리 중..." : label}
    </button>
  );
}
