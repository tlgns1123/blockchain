"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SALE_TYPE_LABEL } from "@/types";
import type { Listing } from "@/types";
import { ipfsUrl } from "@/lib/ipfs";
import { formatBKT } from "@/lib/utils";

const BADGE: Record<0 | 1 | 2, string> = {
  0: "bg-emerald-500/15 text-emerald-400",
  1: "bg-amber-500/15 text-amber-400",
  2: "bg-brand-500/15 text-brand-400",
};

interface StatusBadge {
  label: string;
  className: string;
}

function MiniCountdown({ endTime }: { endTime: bigint }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = Number(endTime) - Math.floor(Date.now() / 1000);
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const tick = () => {
      const diff = Number(endTime) - Math.floor(Date.now() / 1000);
      setRemaining(diff > 0 ? diff : 0);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (remaining <= 0) return <span style={{ color: "#ef4444" }}>종료</span>;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const color = remaining < 3600 ? "#ef4444" : remaining < 86400 ? "#f59e0b" : "#a0a0bc";
  const text = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;

  return <span style={{ color }}>{text}</span>;
}

interface Props {
  listing: Listing;
  wishlisted?: boolean;
  onWishlistToggle?: (id: string) => void;
  statusBadge?: StatusBadge | null;
  endingSoon?: boolean;
  endTime?: bigint;
  viewCount?: number;
  sellerNickname?: string;
  price?: bigint;
}

export default function ItemCard({
  listing,
  wishlisted = false,
  onWishlistToggle,
  statusBadge,
  endingSoon,
  endTime,
  viewCount,
  sellerNickname,
  price,
}: Props) {
  const sellerLabel = sellerNickname ?? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`;
  const showCountdown = (listing.saleType === 1 || listing.saleType === 2) && endTime && endTime > 0n;

  return (
    <div className="relative group">
      <Link href={`/item/${listing.id}`}>
        <div
          className="overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(139,92,246,0.35)";
            el.style.boxShadow = "0 0 25px rgba(139,92,246,0.12), 0 8px 32px rgba(0,0,0,0.4)";
            el.style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(255,255,255,0.08)";
            el.style.boxShadow = "none";
            el.style.transform = "translateY(0)";
          }}
        >
          <div className="aspect-square overflow-hidden relative" style={{ background: "rgba(255,255,255,0.03)" }}>
            {listing.imageHash ? (
              <img
                src={ipfsUrl(listing.imageHash)}
                alt={listing.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <span className="text-3xl opacity-30">📦</span>
                <span className="text-xs" style={{ color: "#2c2c42" }}>
                  이미지 없음
                </span>
              </div>
            )}
            {endingSoon && (
              <span
                className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                style={{ background: "rgba(239,68,68,0.9)", backdropFilter: "blur(4px)" }}
              >
                마감 임박
              </span>
            )}
          </div>

          <div className="p-3.5">
            <h3 className="font-semibold text-sm truncate" style={{ color: "#f0f0f8" }}>
              {listing.title}
            </h3>

            {price != null && price > 0n && (
              <p className="text-sm font-bold mt-1" style={{ color: "#c4b5fd" }}>
                {formatBKT(price)}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`badge ${BADGE[listing.saleType]}`}>{SALE_TYPE_LABEL[listing.saleType]}</span>
                {statusBadge && <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showCountdown && (
                  <span className="text-[10px] font-medium">
                    <MiniCountdown endTime={endTime!} />
                  </span>
                )}
                {viewCount != null && (
                  <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#565670" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    {viewCount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <Link
                href={`/seller/${listing.seller}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] transition-colors truncate block"
                style={{ color: "#565670" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c4b5fd"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#565670"; }}
              >
                {sellerLabel}
              </Link>
            </div>
          </div>
        </div>
      </Link>

      {onWishlistToggle && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onWishlistToggle(listing.id.toString());
          }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            wishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            background: wishlisted ? "rgba(239,68,68,0.9)" : "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: wishlisted ? "#ffffff" : "#a0a0bc",
            boxShadow: wishlisted ? "0 0 12px rgba(239,68,68,0.4)" : "none",
          }}
          title={wishlisted ? "찜 해제" : "찜하기"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
