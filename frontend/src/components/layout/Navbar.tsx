"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useBktBalance } from "@/hooks/useToken";
import { useChatRooms } from "@/hooks/useChat";
import { truncateAddress } from "@/lib/utils";
import { formatUnits } from "viem";

const NAV_LINKS = [
  { href: "/marketplace", label: "거래 목록" },
  { href: "/sell", label: "판매하기" },
  { href: "/exchange", label: "환전소" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const { address, status } = useAccount();

  useEffect(() => {
    if (
      user?.walletAddress &&
      address &&
      status === "connected" &&
      address.toLowerCase() !== user.walletAddress.toLowerCase()
    ) {
      logout();
    }
  }, [address, status, user?.walletAddress]);

  const { data: bktBalance } = useBktBalance(address);
  const { unreadTotal } = useChatRooms(!!user);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(11,11,22,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}
            >
              B
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: "#f0f0f8" }}>
              블록마켓
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive ? "#c4b5fd" : "#a0a0bc",
                    background: isActive ? "rgba(139,92,246,0.15)" : "transparent",
                    borderBottom: isActive ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#f0f0f8";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#a0a0bc";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {!isLoading && (
            user ? (
              <div className="flex items-center gap-2">
                {/* BKT 잔액 */}
                {bktBalance !== undefined && (bktBalance as bigint) > 0n && (
                  <Link
                    href="/exchange"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.3)",
                      color: "#c4b5fd",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    {Number(formatUnits(bktBalance as bigint, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 })} BKT
                  </Link>
                )}

                {/* 지갑 주소 */}
                <ConnectButton.Custom>
                  {({ account, mounted }) => {
                    if (!mounted || !account) return null;
                    return (
                      <div
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#a0a0bc",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {truncateAddress(account.address)}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>

                {/* 채팅 */}
                <Link
                  href="/chat"
                  className="relative p-2 rounded-lg transition-all"
                  style={{
                    color: pathname === "/chat" ? "#c4b5fd" : "#7878a0",
                    background: pathname === "/chat" ? "rgba(139,92,246,0.15)" : "transparent",
                  }}
                  title="채팅"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                  {unreadTotal > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadTotal > 99 ? "99+" : unreadTotal}
                    </span>
                  )}
                </Link>

                {/* 프로필 */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: pathname === "/profile" ? "#c4b5fd" : "#a0a0bc",
                    background: pathname === "/profile" ? "rgba(139,92,246,0.15)" : "transparent",
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                  >
                    {user.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{user.nickname}</span>
                </Link>

                <button
                  onClick={logout}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: "#565670" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a0a0bc"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#565670"; }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary text-xs py-1.5 px-3">
                  로그인
                </Link>
                <Link href="/auth/register" className="btn-primary text-xs py-1.5 px-3">
                  회원가입
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
