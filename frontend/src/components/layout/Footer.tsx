export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(11,11,22,0.8)" }}>
      <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between text-xs" style={{ color: "#565670" }}>
        <span className="font-semibold" style={{ color: "#7878a0" }}>
          블록마켓
        </span>
        <span>Sepolia Testnet · 블록체인 중고거래</span>
      </div>
    </footer>
  );
}
