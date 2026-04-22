import { useWriteContract, useChainId } from "wagmi";
import { parseEther } from "viem";
import TradeFactoryABI from "@/abi/TradeFactory.json";
import { getContracts } from "@/config/contracts";

export function useTradeFactory() {
  const chainId = useChainId();
  const { tradeFactory } = getContracts(chainId);
  const { writeContractAsync, isPending } = useWriteContract();

  const createDirectSale = (
    title: string, description: string, imageHash: string, priceBkt: string
  ) =>
    writeContractAsync({
      address: tradeFactory,
      abi: TradeFactoryABI,
      functionName: "createDirectSale",
      args: [title, description, imageHash, parseEther(priceBkt as `${number}`)],
    });

  const createOpenAuction = (
    title: string, description: string, imageHash: string,
    reserveBkt: string, durationSeconds: number
  ) =>
    writeContractAsync({
      address: tradeFactory,
      abi: TradeFactoryABI,
      functionName: "createOpenAuction",
      args: [title, description, imageHash, parseEther(reserveBkt as `${number}`), BigInt(durationSeconds)],
    });

  const createBlindAuction = (
    title: string, description: string, imageHash: string,
    reserveBkt: string, commitSeconds: number, revealSeconds: number
  ) =>
    writeContractAsync({
      address: tradeFactory,
      abi: TradeFactoryABI,
      functionName: "createBlindAuction",
      args: [title, description, imageHash, parseEther(reserveBkt as `${number}`), BigInt(commitSeconds), BigInt(revealSeconds)],
    });

  return { createDirectSale, createOpenAuction, createBlindAuction, isPending };
}
