"use client";
import Link from "next/link";

const FEATURES = [
  {
    icon: "⚡",
    title: "즉시구매",
    desc: "원하는 가격에 바로 구매. 에스크로가 자동으로 거래를 보호해요.",
    glow: "rgba(52,211,153,0.15)",
    border: "rgba(52,211,153,0.2)",
    iconBg: "rgba(52,211,153,0.1)",
    iconColor: "#34d399",
  },
  {
    icon: "🔔",
    title: "공개경매",
    desc: "투명한 입찰 경쟁. 실시간으로 최고가가 공개되는 영국식 경매.",
    glow: "rgba(251,191,36,0.15)",
    border: "rgba(251,191,36,0.2)",
    iconBg: "rgba(251,191,36,0.1)",
    iconColor: "#fbbf24",
  },
  {
    icon: "🔒",
    title: "블라인드경매",
    desc: "봉인 입찰 방식. 2등 가격에 낙찰되는 Vickrey 경매를 지원해요.",
    glow: "rgba(139,92,246,0.15)",
    border: "rgba(139,92,246,0.3)",
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "#a78bfa",
  },
];

const STATS = [
  { value: "2.5%", label: "거래 수수료" },
  { value: "3가지", label: "거래 방식" },
  { value: "Sepolia", label: "테스트넷" },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decorations */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(40px)" }}
      />

      {/* Hero */}
      <div className="relative text-center pt-16 pb-20">
        {/* Tag */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#c4b5fd",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Sepolia Testnet Live
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-6 leading-tight" style={{ color: "#f0f0f8" }}>
          블록체인 기반<br />
          <span
            style={{
              background: "linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 40%, #a78bfa 80%, #c4b5fd 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradient-x 6s ease infinite",
            }}
          >
            중고거래 플랫폼
          </span>
        </h1>

        <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto" style={{ color: "#7878a0" }}>
          지갑 하나로 거래하세요. 스마트 컨트랙트가 구매부터 정산까지<br className="hidden sm:block" />
          자동으로 처리합니다.
        </p>

        {/* CTA */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/marketplace"
            className="btn-primary text-sm px-7 py-3"
          >
            거래 목록 보기
          </Link>
          <Link
            href="/sell"
            className="btn-secondary text-sm px-7 py-3"
          >
            내 물건 팔기
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-14 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black mb-0.5" style={{ color: "#c4b5fd" }}>{s.value}</div>
              <div className="text-xs" style={{ color: "#565670" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pb-12">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="relative p-5 rounded-2xl transition-all duration-300 group"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${f.border}`,
              boxShadow: `0 0 0 rgba(0,0,0,0)`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${f.glow}, 0 8px 32px rgba(0,0,0,0.3)`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 rgba(0,0,0,0)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
              style={{ background: f.iconBg, color: f.iconColor }}
            >
              {f.icon}
            </div>
            <h3 className="font-bold text-sm mb-2" style={{ color: "#f0f0f8" }}>{f.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#7878a0" }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div
        className="max-w-5xl mx-auto w-full rounded-2xl px-5 py-4 flex items-start gap-3 mb-6"
        style={{
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <span className="text-brand-400 mt-0.5 text-base flex-shrink-0">ℹ</span>
        <p className="text-xs leading-relaxed" style={{ color: "#7878a0" }}>
          모든 거래는 Sepolia 테스트넷에서 진행됩니다. 실제 ETH가 필요하지 않으며,{" "}
          <a href="https://sepoliafaucet.com" target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline transition-colors">
            Sepolia Faucet
          </a>
          에서 테스트용 ETH를 무료로 받을 수 있어요.
        </p>
      </div>
    </div>
  );
}
