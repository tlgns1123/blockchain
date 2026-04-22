import { useReadContracts } from "wagmi";
import DirectSaleABI from "@/abi/DirectSale.json";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import type { Listing } from "@/types";

/** 전체 listings 중 userAddress 가 buyer/winner 인 항목만 반환 */
export function useBoughtListings(
  listings: Listing[] | undefined,
  userAddress: string | undefined
) {
  const all = listings ?? [];

  const contracts = all.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0
      ? DirectSaleABI
      : l.saleType === 1
        ? OpenAuctionABI
        : BlindAuctionABI) as readonly unknown[],
    functionName: l.saleType === 0 ? "buyer" : "winner",
  }));

  const { data, isLoading } = useReadContracts({
    contracts: contracts as any,
    query: { enabled: !!userAddress && all.length > 0 },
  });

  const bought = all.filter((_, i) => {
    const result = data?.[i]?.result as string | undefined;
    return (
      !!result &&
      result !== "0x0000000000000000000000000000000000000000" &&
      result.toLowerCase() === userAddress?.toLowerCase()
    );
  });

  return { bought, isLoading };
}
