"use client";
import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { keccak256, encodePacked, parseEther } from "viem";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import BlockTokenABI from "@/abi/BlockToken.json";
import { getContracts } from "@/config/contracts";

const MAX_UINT256 = 2n ** 256n - 1n;

export function useBlindAuctionState(address: `0x${string}`) {
  const endTime        = useReadContract({ address, abi: BlindAuctionABI, functionName: "endTime" });
  const revealEndTime  = useReadContract({ address, abi: BlindAuctionABI, functionName: "revealEndTime" });
  const state          = useReadContract({ address, abi: BlindAuctionABI, functionName: "state" });
  const winner         = useReadContract({ address, abi: BlindAuctionABI, functionName: "winner" });
  const winningAmount  = useReadContract({ address, abi: BlindAuctionABI, functionName: "winningAmount" });
  const seller         = useReadContract({ address, abi: BlindAuctionABI, functionName: "seller" });
  const reservePrice   = useReadContract({ address, abi: BlindAuctionABI, functionName: "reservePrice" });
  return { endTime, revealEndTime, state, winner, winningAmount, seller, reservePrice };
}

export function useBktAllowanceBlind(owner?: `0x${string}`, spender?: `0x${string}`) {
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

export function useApproveBktBlind(spender: `0x${string}`) {
  const chainId = useChainId();
  const { blockToken } = getContracts(chainId);
  const { writeContractAsync, ...rest } = useWriteContract();
  const approve = () =>
    writeContractAsync({ address: blockToken, abi: BlockTokenABI, functionName: "approve", args: [spender, MAX_UINT256] });
  return { approve, ...rest };
}

/// 클라이언트에서 commitment 해시 생성 (BKT raw 단위)
export function makeCommitment(bidAmountBkt: string, secret: string): `0x${string}` {
  const secretBytes = new TextEncoder().encode(secret);
  const secretPadded = new Uint8Array(32);
  secretPadded.set(secretBytes.slice(0, 32));
  return keccak256(
    encodePacked(
      ["uint256", "bytes32"],
      [parseEther(bidAmountBkt), `0x${Buffer.from(secretPadded).toString("hex")}` as `0x${string}`]
    )
  );
}

export function useCommitBid(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const commit = (commitment: `0x${string}`, deposit: bigint, gas?: bigint) =>
    writeContractAsync({
      address, abi: BlindAuctionABI, functionName: "commit",
      args: [commitment, deposit],
      ...(gas ? { gas } : {}),
    });
  return { commit, ...rest };
}

export function useRevealBid(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const reveal = (bidAmount: bigint, secret: `0x${string}`) =>
    writeContractAsync({
      address, abi: BlindAuctionABI, functionName: "reveal",
      args: [bidAmount, secret],
    });
  return { reveal, ...rest };
}

export function useFinalizeBlindAuction(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const finalize = () =>
    writeContractAsync({ address, abi: BlindAuctionABI, functionName: "finalizeAuction" });
  return { finalize, ...rest };
}

export function useConfirmReceivedBlind(address: `0x${string}`) {
  const { writeContractAsync, ...rest } = useWriteContract();
  const confirm = () =>
    writeContractAsync({ address, abi: BlindAuctionABI, functionName: "confirmReceived" });
  return { confirm, ...rest };
}
