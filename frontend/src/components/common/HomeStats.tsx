"use client";

import { useMemo } from "react";
import { useListings } from "@/hooks/useMarketplace";
import { useTradeStates } from "@/hooks/useTradeStates";
import type { Listing } from "@/types";

export default function HomeStats() {
  const { data: listings, isLoading: listingsLoading } = useListings(0, 200);
  const all = useMemo(() => (listings as Listing[] | undefined) ?? [], [listings]);
  const { stateMap, endTimeMap, isLoading: stateLoading } = useTradeStates(all);
  const isLoading = listingsLoading || stateLoading;

  const stats = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);

    // 총 등록 상품: 누적 (delist 포함)
    const total = all.length;

    // 현재 거래 중: 마켓에 올라와 있는 것 (active=true, 완료/취소 아님, 경매 종료 아님)
    const active = all.filter((l) => {
      if (!l.active) return false;
      const key = l.tradeContract.toLowerCase();
      const s = stateMap[key];
      if (s === 2 || s === 3) return false;
      if ((l.saleType === 1 || l.saleType === 2) && s === 0) {
        const et = endTimeMap[key];
        if (et && et > 0n && Number(et) <= now) return false;
      }
      return true;
    }).length;

    // 거래 완료: confirmReceived 완료된 것
    const done = all.filter((l) => {
      const s = stateMap[l.tradeContract.toLowerCase()];
      return s === 2;
    }).length;

    return { total, active, done };
  }, [all, stateMap, endTimeMap]);

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
