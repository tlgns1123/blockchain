"use client";

const RULES = [
  { label: "8자 이상", test: (v: string) => v.length >= 8 },
  { label: "영문 대문자 포함", test: (v: string) => /[A-Z]/.test(v) },
  { label: "영문 소문자 포함", test: (v: string) => /[a-z]/.test(v) },
  { label: "숫자 포함", test: (v: string) => /\d/.test(v) },
  { label: "특수문자 포함 (!@#$%^&*)", test: (v: string) => /[!@#$%^&*]/.test(v) },
];

export default function PasswordRequirements({ value }: { value: string }) {
  if (!value) return null;

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map(({ label, test }) => {
        const passed = test(value);
        return (
          <li key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${passed ? "text-emerald-400" : "text-gray-500"}`}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
              style={
                passed
                  ? { background: "rgba(52,211,153,0.2)", color: "#34d399" }
                  : { background: "rgba(255,255,255,0.06)", color: "#565670" }
              }
            >
              {passed ? "✓" : "·"}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
