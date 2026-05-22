"use client";

import { useMemo } from "react";
import { useListings } from "@/hooks/useMarketplace";
import { useTradeStates } from "@/hooks/useTradeStates";
import type { Listing } from "@/types";

export default function HomeStats() {
  const { data: listings, isLoading } = useListings(0, 200);
  const all = useMemo(() => (listings as Listing[] | undefined) ?? [], [listings]);
  const { stateMap } = useTradeStates(all);

  const stats = useMemo(() => {
    const total = all.length;
    const active = all.filter((l) => {
      if (!l.active) return false;
      const s = stateMap[l.tradeContract.toLowerCase()];
      return s !== 2 && s !== 3;
    }).length;
    const done = all.filter((l) => {
      const s = stateMap[l.tradeContract.toLowerCase()];
      return s === 2;
    }).length;
    return { total, active, done };
  }, [all, stateMap]);

  const items = [
    { value: isLoading ? "..." : `${stats.total}개`, label: "총 등록 상품" },
    { value: isLoading ? "..." : `${stats.active}개`, label: "현재 거래 중" },
    { value: isLoading ? "..." : `${stats.done}건`, label: "거래 완료" },
  ];

  return (
    <div className="flex items-center justify-center gap-8 mt-14 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {items.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-2xl font-black mb-0.5" style={{ color: "#c4b5fd" }}>
            {s.value}
          </div>
          <div className="text-xs" style={{ color: "#565670" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
