"use client";
import { useReadContract, useChainId } from "wagmi";
import { getContracts } from "@/config/contracts";
import BlockTokenABI from "@/abi/BlockToken.json";

export function useBktBalance(address?: `0x${string}`) {
  const chainId = useChainId();
  const contracts = (() => { try { return getContracts(chainId); } catch { return null; } })();

  return useReadContract({
    address: contracts?.blockToken,
    abi: BlockTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contracts?.blockToken && contracts.blockToken !== "0x" },
  });
}
