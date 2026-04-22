"use client";
import { useState, useMemo } from "react";
import { useListings } from "@/hooks/useMarketplace";
import { useWishlist } from "@/hooks/useWishlist";
import { useTradeStates } from "@/hooks/useTradeStates";
import { useViewCounts } from "@/hooks/useViewCount";
import ItemGrid from "@/components/marketplace/ItemGrid";
import Link from "next/link";
import type { Listing, SaleType } from "@/types";
import { SALE_TYPE_LABEL } from "@/types";

const FILTER_TABS: { key: SaleType | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: 0, label: SALE_TYPE_LABEL[0] },
  { key: 1, label: SALE_TYPE_LABEL[1] },
  { key: 2, label: SALE_TYPE_LABEL[2] },
];

type SortKey = "newest" | "oldest" | "views";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "최신순" },
  { key: "oldest", label: "오래된순" },
  { key: "views",  label: "조회수순" },
];

export default function MarketplacePage() {
  const { data: listings, isLoading } = useListings(0, 100);
  const { ids: wishlistIds, toggle } = useWishlist();
  const { stateMap, endTimeMap } = useTradeStates((listings as Listing[] | undefined) ?? []);
  const allIds = ((listings as Listing[] | undefined) ?? []).map((l) => l.id.toString());
  const viewCounts = useViewCounts(allIds);
  const [query, setQuery] = useState("");
  const [saleFilter, setSaleFilter] = useState<SaleType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    let result = (listings as Listing[] | undefined) ?? [];
    // active=false거나 컨트랙트 state가 완료(2)/취소(3)인 항목 제외
    result = result.filter((l) => {
      if (!l.active) return false;
      const s = stateMap[l.tradeContract.toLowerCase()];
      if (s === 2 || s === 3) return false;
      return true;
    });
    if (saleFilter !== "all") result = result.filter((l) => l.saleType === saleFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }
    // 정렬
    result = [...result].sort((a, b) => {
      if (sort === "newest") return Number(b.id - a.id);
      if (sort === "oldest") return Number(a.id - b.id);
      if (sort === "views") {
        const va = viewCounts[a.id.toString()] ?? 0;
        const vb = viewCounts[b.id.toString()] ?? 0;
        return vb - va;
      }
      return 0;
    });
    return result;
  }, [listings, stateMap, query, saleFilter, sort, viewCounts]);

  const isSearching = query.trim() !== "" || saleFilter !== "all";

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f0f0f8" }}>거래 목록</h1>
          <p className="text-sm mt-0.5" style={{ color: "#565670" }}>블록체인에 등록된 중고 상품들</p>
        </div>
        <Link href="/sell" className="btn-primary text-sm">+ 판매 등록</Link>
      </div>

      {/* 검색창 */}
      <div className="relative mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="상품명 또는 설명으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-base pl-9 pr-4"
        />
      </div>

      {/* 거래 방식 필터 + 정렬 */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSaleFilter(key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: saleFilter === key ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.06)",
                color: saleFilter === key ? "#ffffff" : "#7878a0",
                border: saleFilter === key ? "1px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: saleFilter === key ? "0 0 12px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="flex-shrink-0 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#a0a0bc",
          }}
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">불러오는 중...</p>
        </div>
      ) : (
        <>
          {isSearching && (
            <p className="text-xs text-gray-400 mb-3">
              검색 결과 {filtered.filter((l) => l.active).length}개
            </p>
          )}
          <ItemGrid
            listings={filtered}
            stateMap={stateMap}
            endTimeMap={endTimeMap}
            viewCounts={viewCounts}
            wishlisted={wishlistIds}
            onWishlistToggle={toggle}
            emptyMessage={isSearching ? "검색 결과가 없어요" : undefined}
          />
        </>
      )}
    </div>
  );
}
