import { useReadContracts } from "wagmi";
import DirectSaleABI from "@/abi/DirectSale.json";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import type { Listing } from "@/types";

export function useTradeStates(listings: Listing[]) {
  const auctionListings = listings.filter((l) => l.saleType === 1 || l.saleType === 2);

  const stateContracts = listings.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0 ? DirectSaleABI : OpenAuctionABI) as any,
    functionName: "state",
  }));

  const endTimeContracts = auctionListings.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 1 ? OpenAuctionABI : BlindAuctionABI) as any,
    functionName: "endTime",
  }));

  const { data: stateData } = useReadContracts({
    contracts: stateContracts as any,
    query: { enabled: listings.length > 0 },
  });

  const { data: endTimeData } = useReadContracts({
    contracts: endTimeContracts as any,
    query: { enabled: auctionListings.length > 0 },
  });

  const stateMap: Record<string, number> = {};
  listings.forEach((l, i) => {
    const val = stateData?.[i]?.result;
    stateMap[l.tradeContract.toLowerCase()] =
      typeof val === "number" ? val : typeof val === "bigint" ? Number(val) : 0;
  });

  const endTimeMap: Record<string, bigint> = {};
  let aIdx = 0;
  listings.forEach((l) => {
    if (l.saleType === 1 || l.saleType === 2) {
      const val = endTimeData?.[aIdx]?.result as bigint | undefined;
      if (val != null) endTimeMap[l.tradeContract.toLowerCase()] = val;
      aIdx += 1;
    }
  });

  return { stateMap, endTimeMap };
}

export function getStatusBadge(saleType: 0 | 1 | 2, state: number): { label: string; className: string } | null {
  if (saleType === 0) {
    if (state === 1) return { label: "예약중", className: "bg-orange-50 text-orange-500" };
    if (state === 2) return { label: "거래완료", className: "bg-gray-100 text-gray-400" };
    if (state === 3) return { label: "취소됨", className: "bg-red-50 text-red-400" };
    return null;
  }

  if (state === 0) return { label: "경매중", className: "bg-brand-50 text-brand-600" };
  if (state === 1) return { label: "정산대기", className: "bg-orange-50 text-orange-500" };
  if (state === 2) return { label: "거래완료", className: "bg-gray-100 text-gray-400" };
  return null;
}

export function isEndingSoon(endTime?: bigint): boolean {
  if (!endTime || endTime === 0n) return false;
  const now = Math.floor(Date.now() / 1000);
  const end = Number(endTime);
  return end > now && end - now < 86400;
}
