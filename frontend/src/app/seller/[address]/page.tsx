"use client";
import { useMemo } from "react";
import { useListings } from "@/hooks/useMarketplace";
import { useTradeStates } from "@/hooks/useTradeStates";
import { useViewCounts } from "@/hooks/useViewCount";
import { useReviews } from "@/hooks/useReview";
import ItemGrid from "@/components/marketplace/ItemGrid";
import Link from "next/link";
import { truncateAddress } from "@/lib/utils";
import type { Listing } from "@/types";

function StarRating({ avg, total }: { avg: number | null; total: number }) {
  if (avg === null) return <span className="text-xs text-gray-400">리뷰 없음</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= Math.round(avg) ? "text-amber-400" : "text-gray-200"}>★</span>
        ))}
      </div>
      <span className="text-sm font-bold text-gray-900">{avg.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({total}건)</span>
    </div>
  );
}

export default function SellerPage({ params }: { params: { address: string } }) {
  const sellerAddr = params.address as `0x${string}`;
  const { data: allListings, isLoading } = useListings(0, 100);
  const { reviews, avg, total } = useReviews(sellerAddr);

  const sellerListings = useMemo(
    () =>
      ((allListings as Listing[] | undefined) ?? []).filter(
        (l) => l.seller.toLowerCase() === sellerAddr.toLowerCase()
      ),
    [allListings, sellerAddr]
  );

  const { stateMap, endTimeMap } = useTradeStates(sellerListings);
  const allIds = sellerListings.map((l) => l.id.toString());
  const viewCounts = useViewCounts(allIds);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5 transition"
      >
        ← 목록
      </Link>

      {/* 판매자 프로필 헤더 */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
          {sellerAddr.slice(2, 4).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-base">{truncateAddress(sellerAddr)}</p>
          <a
            href={`https://sepolia.etherscan.io/address/${sellerAddr}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-500 hover:underline"
          >
            Etherscan에서 보기 →
          </a>
          <div className="mt-2">
            <StarRating avg={avg} total={total} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{sellerListings.filter((l) => l.active).length}</p>
          <p className="text-xs text-gray-400">판매 중</p>
        </div>
      </div>

      {/* 리뷰 섹션 */}
      {reviews.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">거래 후기 ({total})</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {reviews.map((r) => (
              <div key={r._id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-sm ${s <= r.rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {truncateAddress(r.reviewer)} ·{" "}
                  <span className="text-gray-400">{r.role === "buyer" ? "구매자" : "판매자"}</span>
                </p>
                {r.comment && <p className="text-sm text-gray-700 mt-1 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 판매 목록 */}
      <h2 className="font-semibold text-gray-900 mb-3">등록 상품</h2>
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">불러오는 중...</p>
        </div>
      ) : (
        <ItemGrid
          listings={sellerListings}
          stateMap={stateMap}
          endTimeMap={endTimeMap}
          viewCounts={viewCounts}
          emptyMessage="등록된 상품이 없어요."
        />
      )}
    </div>
  );
}
