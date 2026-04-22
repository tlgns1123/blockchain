import { useReadContract, useWriteContract, useChainId } from "wagmi";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import BlockTokenABI from "@/abi/BlockToken.json";
import { getContracts } from "@/config/contracts";

const MAX_UINT256 = 2n ** 256n - 1n;

export function useOpenAuctionState(address: `0x${string}`) {
  const endTime        = useReadContract({ address, abi: OpenAuctionABI, functionName: "endTime" });
  const highestBidder  = useReadContract({ address, abi: OpenAuctionABI, functionName: "highestBidder" });
  const highestBid     = useReadContract({ address, abi: OpenAuctionABI, functionName: "highestBid" });
  const state          = useReadContract({ address, abi: OpenAuctionABI, functionName: "state" });
  const winner         = useReadContract({ address, abi: OpenAuctionABI, functionName: "winner" });
  const seller         = useReadContract({ address, abi: OpenAuctionABI, functionName: "seller" });
  const reservePrice   = useReadContract({ address, abi: OpenAuctionABI, functionName: "reservePrice" });
  return { endTime, highestBidder, highestBid, state, winner, seller, reservePrice };
}

export function useBktAllowanceOpen(owner?: `0x${string}`, spender?: `0x${string}`) {
  const chainId = useChainId();
  const { blockToken } = getContracts(chainId);
  return useReadContract({
    address: blockToken,
    abi: BlockTokenABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!owner && !!spender },
  });
}

export function useApproveBktOpen(spender: `0x${string}`) {
  const chainId = useChainId();
  const { blockToken } = getContracts(chainId);
  const { writeContractAsync, ...rest } = useWriteContract();
  const approve = () =>
    writeContractAsync({ address: blockToken, abi: BlockTokenABI, functionName: "approve", args: [spender, MAX_UINT256] });
  return { approve, ...rest };
}

export function usePlaceBid(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const placeBid = (amount: bigint, gas?: bigint) =>
    writeContractAsync({ address, abi: OpenAuctionABI, functionName: "bid", args: [amount], ...(gas ? { gas } : {}) });
  return { placeBid, ...rest };
}

export function useEndAuction(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const endAuction = () =>
    writeContractAsync({ address, abi: OpenAuctionABI, functionName: "endAuction" });
  return { endAuction, ...rest };
}

export function useWithdrawRefund(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const withdraw = () =>
    writeContractAsync({ address, abi: OpenAuctionABI, functionName: "withdrawRefund" });
  return { withdraw, ...rest };
}

export function useConfirmReceivedOpen(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const confirm = () =>
    writeContractAsync({ address, abi: OpenAuctionABI, functionName: "confirmReceived" });
  return { confirm, ...rest };
}
