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

  const priceContracts = listings.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0 ? DirectSaleABI : l.saleType === 1 ? OpenAuctionABI : BlindAuctionABI) as any,
    functionName: l.saleType === 0 ? "price" : "reservePrice",
  }));

  const { data: stateData } = useReadContracts({
    contracts: stateContracts as any,
    query: { enabled: listings.length > 0 },
  });

  const { data: endTimeData } = useReadContracts({
    contracts: endTimeContracts as any,
    query: { enabled: auctionListings.length > 0 },
  });

  const { data: priceData } = useReadContracts({
    contracts: priceContracts as any,
    query: { enabled: listings.length > 0 },
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

  const priceMap: Record<string, bigint> = {};
  listings.forEach((l, i) => {
    const val = priceData?.[i]?.result as bigint | undefined;
    if (val != null) priceMap[l.tradeContract.toLowerCase()] = val;
  });

  return { stateMap, endTimeMap, priceMap };
}

export function getStatusBadge(
  saleType: 0 | 1 | 2,
  state: number,
  endTime?: bigint,
): { label: string; className: string } | null {
  if (saleType === 0) {
    if (state === 1) return { label: "예약중", className: "bg-orange-50 text-orange-500" };
    if (state === 2) return { label: "거래완료", className: "bg-gray-100 text-gray-400" };
    if (state === 3) return { label: "취소됨", className: "bg-red-50 text-red-400" };
    return null;
  }

  if (state === 0) {
    const now = Math.floor(Date.now() / 1000);
    const ended = endTime && endTime > 0n && Number(endTime) <= now;
    if (ended) return { label: "경매종료", className: "bg-red-500/15 text-red-400" };
    return { label: "경매중", className: "bg-brand-50 text-brand-600" };
  }
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
