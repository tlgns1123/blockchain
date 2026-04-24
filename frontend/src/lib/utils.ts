import { formatEther } from "viem";

export function formatETH(wei: bigint, decimals = 4): string {
  return `${parseFloat(formatEther(wei)).toFixed(decimals)} ETH`;
}

export function formatBKT(raw: bigint, decimals = 0): string {
  const val = parseFloat(formatEther(raw));
  return `${val.toLocaleString("en-US", { maximumFractionDigits: decimals })} BKT`;
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function secondsUntil(unixTimestamp: bigint): number {
  return Math.max(0, Number(unixTimestamp) - Math.floor(Date.now() / 1000));
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "종료";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}
