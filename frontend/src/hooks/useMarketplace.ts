import { useReadContract, useWriteContract, useChainId } from "wagmi";
import MarketplaceABI from "@/abi/Marketplace.json";
import { getContracts } from "@/config/contracts";

export function useListings(offset = 0, limit = 20) {
  const chainId = useChainId();
  const { marketplace } = getContracts(chainId);

  return useReadContract({
    address: marketplace,
    abi: MarketplaceABI,
    functionName: "getListings",
    args: [BigInt(offset), BigInt(limit)],
    query: { staleTime: 30_000 },
  });
}

export function useListing(listingId: bigint) {
  const chainId = useChainId();
  const { marketplace } = getContracts(chainId);

  return useReadContract({
    address: marketplace,
    abi: MarketplaceABI,
    functionName: "getListing",
    args: [listingId],
  });
}

export function useDelistItem() {
  const chainId = useChainId();
  const { marketplace } = getContracts(chainId);
  const { writeContractAsync, ...rest } = useWriteContract();

  const delistItem = (listingId: bigint) =>
    writeContractAsync({
      address: marketplace,
      abi: MarketplaceABI,
      functionName: "delistItem",
      args: [listingId],
    });

  return { delistItem, ...rest };
}
