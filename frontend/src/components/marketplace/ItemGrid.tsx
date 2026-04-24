import Link from "next/link";
import ItemCard from "./ItemCard";
import { getStatusBadge, isEndingSoon } from "@/hooks/useTradeStates";
import type { Listing } from "@/types";

interface Props {
  listings: Listing[];
  stateMap?: Record<string, number>;
  endTimeMap?: Record<string, bigint>;
  viewCounts?: Record<string, number>;
  wishlisted?: string[];
  onWishlistToggle?: (id: string) => void;
  emptyMessage?: string;
}

export default function ItemGrid({
  listings,
  stateMap,
  endTimeMap,
  viewCounts,
  wishlisted,
  onWishlistToggle,
  emptyMessage,
}: Props) {
  const active = listings.filter((l) => l.active);

  if (active.length === 0) {
    return (
      <div className="py-24 text-center">
        <div className="text-4xl mb-3">🗂️</div>
        <p className="text-sm text-gray-500 font-medium mb-1">{emptyMessage ?? "아직 등록된 상품이 없습니다."}</p>
        {!emptyMessage && (
          <>
            <p className="text-xs text-gray-400 mb-5">첫 번째 상품을 직접 등록해 보세요.</p>
            <Link href="/sell" className="btn-primary text-sm">
              상품 등록하기
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {active.map((l) => {
        const key = l.tradeContract.toLowerCase();
        const state = stateMap?.[key];
        const statusBadge = state !== undefined ? getStatusBadge(l.saleType, state) : null;
        const endTime = endTimeMap?.[key];

        return (
          <ItemCard
            key={l.id.toString()}
            listing={l}
            statusBadge={statusBadge}
            endingSoon={isEndingSoon(endTime)}
            viewCount={viewCounts?.[l.id.toString()]}
            wishlisted={wishlisted?.includes(l.id.toString())}
            onWishlistToggle={onWishlistToggle}
          />
        );
      })}
    </div>
  );
}
