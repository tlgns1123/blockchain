"use client";
import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";

export interface BidEntry {
  bidder: `0x${string}`;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

const BID_PLACED_EVENT = parseAbiItem(
  "event BidPlaced(address indexed bidder, uint256 amount)"
);

// Sepolia 배포 이후 블록 (최근 500000 블록 조회)
const FROM_BLOCK = BigInt(7_000_000);

export function useBidHistory(contractAddress?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !contractAddress) return;
    setLoading(true);
    publicClient
      .getLogs({
        address: contractAddress,
        event: BID_PLACED_EVENT,
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      })
      .then((logs) => {
        const entries: BidEntry[] = logs
          .map((log) => ({
            bidder: log.args.bidder as `0x${string}`,
            amount: log.args.amount as bigint,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash as `0x${string}`,
          }))
          .reverse(); // 최신 입찰부터
        setBids(entries);
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  }, [contractAddress, publicClient]);

  return { bids, loading };
}
