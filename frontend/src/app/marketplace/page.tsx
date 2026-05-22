"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseUnits } from "viem";
import Link from "next/link";
import { useListings } from "@/hooks/useMarketplace";
import { useWishlist } from "@/hooks/useWishlist";
import { useTradeStates } from "@/hooks/useTradeStates";
import { useViewCounts } from "@/hooks/useViewCount";
import ItemGrid from "@/components/marketplace/ItemGrid";
import type { Listing, SaleType } from "@/types";
import { SALE_TYPE_LABEL } from "@/types";

const FILTER_TABS: { key: SaleType | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: 0, label: SALE_TYPE_LABEL[0] },
  { key: 1, label: SALE_TYPE_LABEL[1] },
  { key: 2, label: SALE_TYPE_LABEL[2] },
];

type SortKey = "newest" | "oldest" | "views" | "price_asc" | "price_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "최신순" },
  { key: "oldest", label: "오래된순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
  { key: "views", label: "조회순" },
];

const PAGE_SIZE = 20;

function parseBkt(val: string): bigint | null {
  try {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return null;
    return parseUnits(String(n), 18);
  } catch {
    return null;
  }
}

export default function MarketplacePage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: listings, isLoading } = useListings(0, limit);
  const { ids: wishlistIds, toggle } = useWishlist();
  const { stateMap, endTimeMap, priceMap } = useTradeStates((listings as Listing[] | undefined) ?? []);
  const allIds = ((listings as Listing[] | undefined) ?? []).map((l) => l.id.toString());
  const viewCounts = useViewCounts(allIds);
  const [sellerNicknames, setSellerNicknames] = useState<Record<string, string>>({});
  const fetchedWallets = useRef<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [saleFilter, setSaleFilter] = useState<SaleType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [minBkt, setMinBkt] = useState("");
  const [maxBkt, setMaxBkt] = useState("");

  useEffect(() => {
    const all = (listings as Listing[] | undefined) ?? [];
    if (all.length === 0) return;

    const newWallets = [...new Set(all.map((l) => l.seller.toLowerCase()))].filter(
      (w) => !fetchedWallets.current.has(w)
    );
    if (newWallets.length === 0) return;

    newWallets.forEach((w) => fetchedWallets.current.add(w));
    fetch(`/api/auth/users?wallets=${newWallets.join(",")}`)
      .then((r) => r.json())
      .then((data: Record<string, string>) =>
        setSellerNicknames((prev) => ({ ...prev, ...data }))
      )
      .catch(() => {});
  }, [listings]);

  const filtered = useMemo(() => {
    let result = (listings as Listing[] | undefined) ?? [];

    result = result.filter((l) => {
      if (!l.active) return false;
      const key = l.tradeContract.toLowerCase();
      const s = stateMap[key];
      if (s === 2 || s === 3) return false;
      if ((l.saleType === 1 || l.saleType === 2) && s === 0) {
        const endTime = endTimeMap[key];
        if (endTime && endTime > 0n && Number(endTime) <= Math.floor(Date.now() / 1000)) return false;
      }
      return true;
    });

    if (saleFilter !== "all") result = result.filter((l) => l.saleType === saleFilter);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }

    const minWei = parseBkt(minBkt);
    const maxWei = parseBkt(maxBkt);
    if (minWei !== null || maxWei !== null) {
      result = result.filter((l) => {
        const p = priceMap[l.tradeContract.toLowerCase()];
        if (p == null) return true;
        if (minWei !== null && p < minWei) return false;
        if (maxWei !== null && p > maxWei) return false;
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      if (sort === "newest") return Number(b.id - a.id);
      if (sort === "oldest") return Number(a.id - b.id);
      if (sort === "views") {
        return (viewCounts[b.id.toString()] ?? 0) - (viewCounts[a.id.toString()] ?? 0);
      }
      if (sort === "price_asc" || sort === "price_desc") {
        const pa = priceMap[a.tradeContract.toLowerCase()] ?? 0n;
        const pb = priceMap[b.tradeContract.toLowerCase()] ?? 0n;
        return sort === "price_asc" ? (pa < pb ? -1 : pa > pb ? 1 : 0) : pa < pb ? 1 : pa > pb ? -1 : 0;
      }
      return 0;
    });

    return result;
  }, [listings, stateMap, endTimeMap, priceMap, query, saleFilter, sort, viewCounts, minBkt, maxBkt]);

  const isSearching = query.trim() !== "" || saleFilter !== "all" || minBkt !== "" || maxBkt !== "";
  const hasMore = ((listings as Listing[] | undefined) ?? []).length >= limit;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f0f0f8" }}>
            거래 목록
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#565670" }}>
            블록체인에 등록된 중고 상품을 둘러보세요.
          </p>
        </div>
        <Link href="/sell" className="btn-primary text-sm">
          + 판매 등록
        </Link>
      </div>

      <div className="relative mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="상품명이나 설명으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-base pl-9 pr-4"
        />
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            placeholder="최소 가격 (BKT)"
            value={minBkt}
            onChange={(e) => setMinBkt(e.target.value)}
            className="input-base w-full text-sm"
          />
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            placeholder="최대 가격 (BKT)"
            value={maxBkt}
            onChange={(e) => setMaxBkt(e.target.value)}
            className="input-base w-full text-sm"
          />
        </div>
        {(minBkt || maxBkt) && (
          <button
            onClick={() => { setMinBkt(""); setMaxBkt(""); }}
            className="px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            초기화
          </button>
        )}
      </div>

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
            <option key={key} value={key}>
              {label}
            </option>
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
            <p className="text-xs text-gray-400 mb-3">검색 결과 {filtered.length}개</p>
          )}
          <ItemGrid
            listings={filtered}
            stateMap={stateMap}
            endTimeMap={endTimeMap}
            priceMap={priceMap}
            viewCounts={viewCounts}
            sellerNicknames={sellerNicknames}
            wishlisted={wishlistIds}
            onWishlistToggle={toggle}
            emptyMessage={isSearching ? "검색 결과가 없습니다." : undefined}
          />
          {hasMore && !isSearching && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#a0a0bc",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.4)";
                  (e.currentTarget as HTMLElement).style.color = "#c4b5fd";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.color = "#a0a0bc";
                }}
              >
                더 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
