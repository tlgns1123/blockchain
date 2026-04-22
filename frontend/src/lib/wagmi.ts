import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, createStorage } from "wagmi";

const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID || "";
const rpcUrl = alchemyId.startsWith("http")
  ? alchemyId
  : alchemyId
    ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyId}`
    : undefined;

const storage = typeof window !== "undefined"
  ? createStorage({ storage: window.localStorage })
  : undefined;

export const wagmiConfig = getDefaultConfig({
  appName: "블록마켓",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(rpcUrl),
  },
  ...(storage ? { storage } : {}),
});
