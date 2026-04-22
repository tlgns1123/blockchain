"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useListing } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";
import { useViewCount, useIncrementView } from "@/hooks/useViewCount";
import { useReviews } from "@/hooks/useReview";
import { truncateAddress } from "@/lib/utils";
import DirectSalePanel from "@/components/trading/DirectSalePanel";
import OpenAuctionPanel from "@/components/trading/OpenAuctionPanel";
import BlindAuctionPanel from "@/components/trading/BlindAuctionPanel";
import { SALE_TYPE_LABEL } from "@/types";
import Link from "next/link";

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
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
    } catch { setError("네트워크 오류"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
        {done ? (
          <div className="text-center py-4">
            <p className="font-semibold text-gray-900 mb-1">신고가 접수됐어요.</p>
            <p className="text-xs text-gray-400">검토 후 조치하겠습니다.</p>
            <button onClick={onClose} className="btn-primary text-sm mt-5 w-full">닫기</button>
          </div>
        ) : (
          <>
            <h2 className="font-bold text-gray-900 mb-4">상품 신고</h2>
            <textarea
              className="input-base resize-none text-sm"
              rows={3}
              placeholder="신고 사유를 입력해주세요. (사기, 허위 정보 등)"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{reason.length}/200</p>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">취소</button>
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
  const myAddr = user?.walletAddress ?? address ?? "";

  const l = listing as any;
  const isSeller = !!l && !!myAddr && l.seller?.toLowerCase() === myAddr.toLowerCase();
  const viewCount = useViewCount(params.id);
  useIncrementView(params.id);

  // 다중 이미지
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [selectedImg, setSelectedImg] = useState(0);
  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/listing-images?listingId=${params.id}`)
      .then((r) => r.json())
      .then((d) => setExtraImages(d.images ?? []))
      .catch(() => {});
  }, [params.id]);

  // 판매자 닉네임
  const [sellerNickname, setSellerNickname] = useState<string | null>(null);
  useEffect(() => {
    if (!l?.seller) return;
    fetch(`/api/auth/user?wallet=${l.seller}`)
      .then((r) => r.json())
      .then((d) => setSellerNickname(d.nickname ?? null))
      .catch(() => {});
  }, [l?.seller]);

  // 판매자 리뷰
  const { avg: sellerAvg, total: sellerTotal } = useReviews(l?.seller);

  const [showReport, setShowReport] = useState(false);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!l || !l.active) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium text-gray-700">존재하지 않는 상품이에요</p>
          <Link href="/marketplace" className="inline-block mt-4 text-sm text-brand-500 hover:underline">
            목록으로 돌아가기 →
          </Link>
        </div>
      </div>
    );
  }

  const saleType = l.saleType as 0 | 1 | 2;
  const isGuest = !user && !address;
  const allImages = [l.imageHash, ...extraImages].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
          ← 목록
        </Link>
        {user && !isSeller && (
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
            신고
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 이미지 갤러리 */}
        <div className="space-y-2">
          <div className="card aspect-square overflow-hidden flex items-center justify-center bg-gray-50">
            {allImages.length > 0 ? (
              <img
                src={allImages[selectedImg].startsWith("/") ? allImages[selectedImg] : `https://ipfs.io/ipfs/${allImages[selectedImg]}`}
                alt={l.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <span className="text-5xl">📦</span>
                <span className="text-xs">이미지 없음</span>
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition
                    ${selectedImg === i ? "border-brand-500" : "border-transparent"}`}
                >
                  <img
                    src={src.startsWith("/") ? src : `https://ipfs.io/ipfs/${src}`}
                    alt={`${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex flex-col gap-4">
          <div>
            <span className={`badge ${SALE_BADGE[saleType]} mb-2`}>{SALE_TYPE_LABEL[saleType]}</span>
            <h1 className="text-xl font-bold" style={{ color: "#f0f0f8" }}>{l.title}</h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#7878a0" }}>{l.description}</p>
          </div>
          <div className="card p-4 text-xs space-y-1.5" style={{ color: "#565670" }}>
            <div className="flex justify-between items-center">
              <span>판매자</span>
              <div className="flex items-center gap-2">
                {sellerAvg !== null && (
                  <span className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                    ★ <span style={{ color: "#a0a0bc" }}>{sellerAvg.toFixed(1)}</span>
                    <span style={{ color: "#565670" }}>({sellerTotal})</span>
                  </span>
                )}
                <Link href={`/seller/${l.seller}`} className="text-brand-400 hover:underline">
                  {sellerNickname ?? truncateAddress(l.seller)}
                </Link>
              </div>
            </div>
            {viewCount != null && (
              <div className="flex justify-between">
                <span>조회수</span>
                <span className="flex items-center gap-1" style={{ color: "#565670" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  {viewCount.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* 판매자에게 연락하기 */}
          {user && !isSeller && (
            <Link
              href={`/chat?listingId=${params.id}&peer=${l.seller}`}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              판매자에게 연락하기
            </Link>
          )}
        </div>
      </div>

      {/* 거래 패널 */}
      <div className="mt-6 relative">
        {isGuest && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl overflow-hidden">
            <div className="absolute inset-0" style={{ background: "rgba(11,11,22,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />
            <div className="relative z-10 rounded-2xl px-8 py-8 flex flex-col items-center gap-3 max-w-xs w-full mx-4" style={{ background: "rgba(20,20,35,0.95)", border: "1px solid rgba(139,92,246,0.25)", boxShadow: "0 0 40px rgba(139,92,246,0.15)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: "#f0f0f8" }}>로그인 후 확인 가능합니다</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#7878a0" }}>거래 기능은<br />로그인 회원에게만 제공돼요.</p>
              </div>
              <Link href="/auth/login" className="btn-primary text-sm w-full text-center mt-1">
                로그인하기
              </Link>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${isGuest ? "pointer-events-none select-none" : ""}`}>
          {saleType === 0 && <DirectSalePanel contractAddress={l.tradeContract} listingId={listingId} listingTitle={l.title} />}
          {saleType === 1 && <OpenAuctionPanel contractAddress={l.tradeContract} listingId={listingId} listingTitle={l.title} />}
          {saleType === 2 && <BlindAuctionPanel contractAddress={l.tradeContract} listingId={listingId} listingTitle={l.title} />}
        </div>
      </div>

      {showReport && <ReportModal listingId={params.id} onClose={() => setShowReport(false)} />}
    </div>
  );
}
