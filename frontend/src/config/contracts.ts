import { sepolia } from "wagmi/chains";

export const SUPPORTED_CHAIN = sepolia;

export const CONTRACT_ADDRESSES: Record<number, {
  marketplace: `0x${string}`;
  tradeFactory: `0x${string}`;
  interestCalculator: `0x${string}`;
  platform: `0x${string}`;
  blockToken: `0x${string}`;
  exchange: `0x${string}`;
}> = {
  [sepolia.id]: {
    marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x") as `0x${string}`,
    tradeFactory: (process.env.NEXT_PUBLIC_TRADE_FACTORY_ADDRESS || "0x") as `0x${string}`,
    interestCalculator: (process.env.NEXT_PUBLIC_INTEREST_CALCULATOR_ADDRESS || "0x") as `0x${string}`,
    platform: (process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || "0x") as `0x${string}`,
    blockToken: (process.env.NEXT_PUBLIC_BLOCK_TOKEN_ADDRESS || "0x") as `0x${string}`,
    exchange: (process.env.NEXT_PUBLIC_EXCHANGE_ADDRESS || "0x") as `0x${string}`,
  },
};

export function getContracts(chainId: number) {
  const addrs = CONTRACT_ADDRESSES[chainId];
  if (!addrs) throw new Error(`Chain ${chainId} not supported`);
  return addrs;
}
