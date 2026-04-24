"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useBktBalance } from "@/hooks/useToken";
import { useChatRooms } from "@/hooks/useChat";
import type { ChatRoom } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/hooks/useNotifications";
import { truncateAddress } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/marketplace", label: "거래 목록" },
  { href: "/sell", label: "판매하기" },
  { href: "/exchange", label: "환전소" },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const NOTIF_ICON: Record<string, string> = {
  purchase: "🛒",
  confirm: "✅",
  open_bid: "🏷️",
  blind_bid: "🕶️",
};

function ChatDropdown({ rooms, onClose }: { rooms: ChatRoom[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-11 w-80 rounded-2xl z-50 overflow-hidden"
      style={{
        background: "rgba(20,20,35,0.98)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold" style={{ color: "#f0f0f8" }}>
          채팅
        </p>
        <Link
          href="/chat"
          onClick={onClose}
          className="text-[10px] transition-colors"
          style={{ color: "#7878a0" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#c4b5fd";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#7878a0";
          }}
        >
          전체 보기 →
        </Link>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="text-center text-xs py-8" style={{ color: "#565670" }}>
            채팅 내역이 없습니다.
          </p>
        ) : (
          rooms.map((room) => (
            <Link
              key={`${room.listingId}:${room.peer}`}
              href={`/chat?listingId=${room.listingId}&peer=${room.peer}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
              >
                {(room.peerNickname ?? room.peer).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold truncate" style={{ color: "#f0f0f8" }}>
                    {room.peerNickname ?? truncateAddress(room.peer)}
                  </p>
                  {room.lastMessage?.createdAt && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: "#565670" }}>
                      {timeAgo(room.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "#7878a0" }}>
                  {room.lastMessage?.content ?? ""}
                </p>
              </div>
              {room.unread > 0 && (
                <span
                  className="flex-shrink-0 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  style={{ background: "#8b5cf6" }}
                >
                  {room.unread}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationDropdown({ notifications, onClose }: { notifications: AppNotification[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-11 w-80 rounded-2xl z-50 overflow-hidden"
      style={{
        background: "rgba(20,20,35,0.98)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold" style={{ color: "#f0f0f8" }}>
          알림
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-xs py-8" style={{ color: "#565670" }}>
            알림이 없습니다.
          </p>
        ) : (
          notifications.map((n) => (
            <Link
              key={n._id}
              href={n.listingId ? `/item/${n.listingId}` : "#"}
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/5"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: n.read ? "transparent" : "rgba(139,92,246,0.06)",
              }}
            >
              <span className="text-base mt-0.5 flex-shrink-0">{NOTIF_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                {n.listingTitle && (
                  <p className="text-[10px] truncate mb-0.5" style={{ color: "#7878a0" }}>
                    {n.listingTitle}
                  </p>
                )}
                <p className="text-xs leading-snug" style={{ color: "#c4c4d8" }}>
                  {n.message}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "#565670" }}>
                  {timeAgo(n.createdAt)}
                </p>
              </div>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0 mt-1.5" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const { address, status } = useAccount();
  const [showChat, setShowChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user?.walletAddress && address && status === "connected" && address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      logout();
    }
  }, [address, status, user?.walletAddress, logout]);

  const { data: bktBalance } = useBktBalance(address);
  const { rooms, unreadTotal } = useChatRooms(!!user);
  const { notifications, unreadCount, markAllRead } = useNotifications(!!user);

  const handleChatClick = () => {
    setShowNotifications(false);
    setShowChat((v) => !v);
  };

  const handleBellClick = () => {
    setShowChat(false);
    if (!showNotifications) markAllRead();
    setShowNotifications((v) => !v);
  };

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

        <div className="flex items-center gap-2.5">
          {!isLoading &&
            (user ? (
              <div className="flex items-center gap-2">
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

                <div className="relative">
                  <button
                    onClick={handleChatClick}
                    className="relative p-2 rounded-lg transition-all"
                    style={{
                      color: showChat ? "#c4b5fd" : "#7878a0",
                      background: showChat ? "rgba(139,92,246,0.15)" : "transparent",
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
                  </button>
                  {showChat && <ChatDropdown rooms={rooms} onClose={() => setShowChat(false)} />}
                </div>

                <div className="relative">
                  <button
                    onClick={handleBellClick}
                    className="relative p-2 rounded-lg transition-all"
                    style={{
                      color: showNotifications ? "#c4b5fd" : "#7878a0",
                      background: showNotifications ? "rgba(139,92,246,0.15)" : "transparent",
                    }}
                    title="알림"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && <NotificationDropdown notifications={notifications} onClose={() => setShowNotifications(false)} />}
                </div>

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
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#a0a0bc";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#565670";
                  }}
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
            ))}
        </div>
      </div>
    </nav>
  );
}
