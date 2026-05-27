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

// 싱글톤: HMR 재실행 시 WalletConnect가 중복 초기화되는 것을 방지
const globalKey = "__wagmiConfig__";
declare global { interface Window { [globalKey]?: ReturnType<typeof getDefaultConfig> } }

function createConfig() {
  return getDefaultConfig({
    appName: "블록마켓",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder",
    chains: [sepolia],
    transports: {
      [sepolia.id]: http(rpcUrl),
    },
    ...(storage ? { storage } : {}),
  });
}

export const wagmiConfig =
  typeof window === "undefined"
    ? createConfig()
    : (window[globalKey] ??= createConfig());
