"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useListing } from "@/hooks/useMarketplace";
import { useIncrementView, useViewCount } from "@/hooks/useViewCount";
import { useReviews } from "@/hooks/useReview";
import { truncateAddress } from "@/lib/utils";
import DirectSalePanel from "@/components/trading/DirectSalePanel";
import OpenAuctionPanel from "@/components/trading/OpenAuctionPanel";
import BlindAuctionPanel from "@/components/trading/BlindAuctionPanel";
import { SALE_TYPE_LABEL } from "@/types";

const PENDING_EXTRA_IMAGES_KEY = "bk_pending_extra_images";

const SALE_BADGE: Record<0 | 1 | 2, string> = {
  0: "bg-emerald-500/15 text-emerald-400",
  1: "bg-amber-500/15 text-amber-400",
  2: "bg-brand-500/15 text-brand-400",
};

function ReportModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, reason }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error);
        return;
      }

      setDone(true);
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
        {done ? (
          <div className="text-center py-4">
            <p className="font-semibold text-gray-900 mb-1">신고가 접수되었습니다.</p>
            <p className="text-xs text-gray-400">관리자가 확인 후 조치할 예정입니다.</p>
            <button onClick={onClose} className="btn-primary text-sm mt-5 w-full">
              닫기
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-bold text-gray-900 mb-4">상품 신고</h2>
            <textarea
              className="input-base resize-none text-sm"
              rows={3}
              placeholder="신고 사유를 입력해 주세요."
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{reason.length}/200</p>

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || loading}
                className="btn-primary flex-1 text-sm bg-red-500 hover:bg-red-600 border-red-500 disabled:opacity-40"
              >
                {loading ? "신고 중..." : "신고하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const listingId = BigInt(params.id);
  const { data: listing, isLoading } = useListing(listingId);
  const { address } = useAccount();
  const { user } = useAuth();
  const myAddress = user?.walletAddress ?? address ?? "";

  const item = listing as any;
  const isSeller = !!item && !!myAddress && item.seller?.toLowerCase() === myAddress.toLowerCase();
  const isGuest = !user && !address;
  const viewCount = useViewCount(params.id);
  useIncrementView(params.id);

  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [selectedImg, setSelectedImg] = useState(0);
  const [sellerNickname, setSellerNickname] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/listing-images?listingId=${params.id}`)
      .then((response) => response.json())
      .then((data) => setExtraImages(data.images ?? []))
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (!params.id || typeof window === "undefined") return;

    const retryPendingImages = async () => {
      const raw = localStorage.getItem(PENDING_EXTRA_IMAGES_KEY);
      if (!raw) return;

      try {
        const pending = JSON.parse(raw) as { listingId?: string; images?: string[] };
        if (pending.listingId !== params.id || !Array.isArray(pending.images) || pending.images.length === 0) return;

        const response = await fetch("/api/listing-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: pending.listingId, images: pending.images }),
        });

        if (response.ok) {
          localStorage.removeItem(PENDING_EXTRA_IMAGES_KEY);
          setExtraImages(pending.images);
        }
      } catch {}
    };

    void retryPendingImages();
  }, [params.id]);

  useEffect(() => {
    if (!item?.seller) return;

    fetch(`/api/auth/user?wallet=${item.seller}`)
      .then((response) => response.json())
      .then((data) => setSellerNickname(data.nickname ?? null))
      .catch(() => {});
  }, [item?.seller]);

  const { avg: sellerAvg, total: sellerTotal } = useReviews(item?.seller);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!item || !item.active) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium text-gray-700">존재하지 않거나 판매가 종료된 상품입니다.</p>
          <Link href="/marketplace" className="inline-block mt-4 text-sm text-brand-500 hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const saleType = item.saleType as 0 | 1 | 2;
  const allImages = [item.imageHash, ...extraImages].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
          ← 목록
        </Link>

        {user && !isSeller && (
          <button onClick={() => setShowReport(true)} className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1">
            신고
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="card aspect-square overflow-hidden flex items-center justify-center bg-gray-50">
            {allImages.length > 0 ? (
              <img
                src={allImages[selectedImg].startsWith("/") ? allImages[selectedImg] : `https://ipfs.io/ipfs/${allImages[selectedImg]}`}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <span className="text-5xl">🖼️</span>
                <span className="text-xs">이미지가 없습니다.</span>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((src, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImg(index)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                    selectedImg === index ? "border-brand-500" : "border-transparent"
                  }`}
                >
                  <img src={src.startsWith("/") ? src : `https://ipfs.io/ipfs/${src}`} alt={`${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className={`badge ${SALE_BADGE[saleType]} mb-2`}>{SALE_TYPE_LABEL[saleType]}</span>
            <h1 className="text-xl font-bold" style={{ color: "#f0f0f8" }}>
              {item.title}
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#7878a0" }}>
              {item.description}
            </p>
          </div>

          <div className="card p-4 text-xs space-y-2" style={{ color: "#565670" }}>
            <div className="flex justify-between items-center">
              <span>판매자</span>
              <div className="flex items-center gap-2">
                {sellerAvg !== null && (
                  <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                    ★ <span style={{ color: "#a0a0bc" }}>{sellerAvg.toFixed(1)}</span>
                    <span style={{ color: "#565670" }}>({sellerTotal})</span>
                  </span>
                )}
                <Link href={`/seller/${item.seller}`} className="text-brand-400 hover:underline">
                  {sellerNickname ?? truncateAddress(item.seller)}
                </Link>
              </div>
            </div>

            {viewCount != null && (
              <div className="flex justify-between">
                <span>조회수</span>
                <span>{viewCount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {user && !isSeller && (
            <Link href={`/chat?listingId=${params.id}&peer=${item.seller}`} className="w-full btn-secondary text-sm flex items-center justify-center gap-2">
              판매자에게 문의하기
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 relative">
        {isGuest && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl overflow-hidden">
            <div className="absolute inset-0" style={{ background: "rgba(11,11,22,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />
            <div
              className="relative z-10 rounded-2xl px-8 py-8 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
              style={{ background: "rgba(20,20,35,0.95)", border: "1px solid rgba(139,92,246,0.25)", boxShadow: "0 0 40px rgba(139,92,246,0.15)" }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                🔐
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: "#f0f0f8" }}>
                  로그인 후 거래할 수 있습니다.
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#7878a0" }}>
                  거래 기능은 로그인한 사용자에게만 제공됩니다.
                </p>
              </div>
              <Link href="/auth/login" className="btn-primary text-sm w-full text-center mt-1">
                로그인하기
              </Link>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${isGuest ? "pointer-events-none select-none" : ""}`}>
          {saleType === 0 && <DirectSalePanel contractAddress={item.tradeContract} listingId={listingId} listingTitle={item.title} />}
          {saleType === 1 && <OpenAuctionPanel contractAddress={item.tradeContract} listingId={listingId} listingTitle={item.title} />}
          {saleType === 2 && <BlindAuctionPanel contractAddress={item.tradeContract} listingId={listingId} listingTitle={item.title} />}
        </div>
      </div>

      {showReport && <ReportModal listingId={params.id} onClose={() => setShowReport(false)} />}
    </div>
  );
}
