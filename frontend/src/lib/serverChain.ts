import { createPublicClient, getAddress, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import MarketplaceABI from "@/abi/Marketplace.json";
import DirectSaleABI from "@/abi/DirectSale.json";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import { getContracts } from "@/config/contracts";

type ListingSnapshot = {
  id: bigint;
  seller: `0x${string}`;
  title: string;
  description: string;
  imageHash: string;
  saleType: 0 | 1 | 2;
  tradeContract: `0x${string}`;
  active: boolean;
};

export type DirectSaleContext = {
  kind: "direct";
  state: number;
  seller: `0x${string}`;
  buyer: `0x${string}`;
};

export type OpenAuctionContext = {
  kind: "open";
  state: number;
  seller: `0x${string}`;
  winner: `0x${string}`;
  highestBidder: `0x${string}`;
};

export type BlindAuctionContext = {
  kind: "blind";
  state: number;
  seller: `0x${string}`;
  winner: `0x${string}`;
  highestBidder: `0x${string}`;
};

export type TradeContext = DirectSaleContext | OpenAuctionContext | BlindAuctionContext;

export type ListingTradeContext = {
  listing: ListingSnapshot;
  trade: TradeContext;
};

let cachedClient: ReturnType<typeof createPublicClient> | null = null;

function normalizeAddress(value?: string | null): `0x${string}` | null {
  if (!value || !isAddress(value)) {
    return null;
  }

  return getAddress(value) as `0x${string}`;
}

function getRpcUrl() {
  const alchemy = process.env.NEXT_PUBLIC_ALCHEMY_ID || "";

  if (alchemy.startsWith("http")) {
    return alchemy;
  }

  if (alchemy) {
    return `https://eth-sepolia.g.alchemy.com/v2/${alchemy}`;
  }

  return process.env.SEPOLIA_RPC_URL || "";
}

function getPublicClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    return null;
  }

  cachedClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  return cachedClient;
}

function getMarketplaceAddress() {
  try {
    return normalizeAddress(getContracts(sepolia.id).marketplace);
  } catch {
    return null;
  }
}

export function isServerChainReady() {
  return !!getPublicClient() && !!getMarketplaceAddress();
}

export async function getListingSnapshot(listingId: string | bigint): Promise<ListingSnapshot | null> {
  const client = getPublicClient();
  const marketplace = getMarketplaceAddress();

  if (!client || !marketplace) {
    return null;
  }

  try {
    const listing = (await client.readContract({
      address: marketplace,
      abi: MarketplaceABI,
      functionName: "getListing",
      args: [BigInt(listingId)],
    })) as ListingSnapshot;

    if (!listing?.tradeContract || !isAddress(listing.tradeContract)) {
      return null;
    }

    return {
      ...listing,
      seller: getAddress(listing.seller) as `0x${string}`,
      tradeContract: getAddress(listing.tradeContract) as `0x${string}`,
    };
  } catch {
    return null;
  }
}

export async function getListingTradeContext(listingId: string | bigint): Promise<ListingTradeContext | null> {
  const client = getPublicClient();
  const listing = await getListingSnapshot(listingId);

  if (!client || !listing) {
    return null;
  }

  try {
    if (listing.saleType === 0) {
      const [state, seller, buyer] = await Promise.all([
        client.readContract({
          address: listing.tradeContract,
          abi: DirectSaleABI,
          functionName: "state",
        }),
        client.readContract({
          address: listing.tradeContract,
          abi: DirectSaleABI,
          functionName: "seller",
        }),
        client.readContract({
          address: listing.tradeContract,
          abi: DirectSaleABI,
          functionName: "buyer",
        }),
      ]);

      return {
        listing,
        trade: {
          kind: "direct",
          state: Number(state),
          seller: getAddress(seller as `0x${string}`) as `0x${string}`,
          buyer: getAddress(buyer as `0x${string}`) as `0x${string}`,
        },
      };
    }

    if (listing.saleType === 1) {
      const [state, seller, winner, highestBidder] = await Promise.all([
        client.readContract({
          address: listing.tradeContract,
          abi: OpenAuctionABI,
          functionName: "state",
        }),
        client.readContract({
          address: listing.tradeContract,
          abi: OpenAuctionABI,
          functionName: "seller",
        }),
        client.readContract({
          address: listing.tradeContract,
          abi: OpenAuctionABI,
          functionName: "winner",
        }),
        client.readContract({
          address: listing.tradeContract,
          abi: OpenAuctionABI,
          functionName: "highestBidder",
        }),
      ]);

      return {
        listing,
        trade: {
          kind: "open",
          state: Number(state),
          seller: getAddress(seller as `0x${string}`) as `0x${string}`,
          winner: getAddress(winner as `0x${string}`) as `0x${string}`,
          highestBidder: getAddress(highestBidder as `0x${string}`) as `0x${string}`,
        },
      };
    }

    const [state, seller, winner, highestBidder] = await Promise.all([
      client.readContract({
        address: listing.tradeContract,
        abi: BlindAuctionABI,
        functionName: "state",
      }),
      client.readContract({
        address: listing.tradeContract,
        abi: BlindAuctionABI,
        functionName: "seller",
      }),
      client.readContract({
        address: listing.tradeContract,
        abi: BlindAuctionABI,
        functionName: "winner",
      }),
      client.readContract({
        address: listing.tradeContract,
        abi: BlindAuctionABI,
        functionName: "highestBidder",
      }),
    ]);

    return {
      listing,
      trade: {
        kind: "blind",
        state: Number(state),
        seller: getAddress(seller as `0x${string}`) as `0x${string}`,
        winner: getAddress(winner as `0x${string}`) as `0x${string}`,
        highestBidder: getAddress(highestBidder as `0x${string}`) as `0x${string}`,
      },
    };
  } catch {
    return null;
  }
}

export async function getBlindCommitDeposit(
  contractAddress: `0x${string}`,
  bidder: string
): Promise<bigint> {
  const client = getPublicClient();
  const normalizedBidder = normalizeAddress(bidder);

  if (!client || !normalizedBidder) {
    return 0n;
  }

  try {
    const result = (await client.readContract({
      address: contractAddress,
      abi: BlindAuctionABI,
      functionName: "commits",
      args: [normalizedBidder],
    })) as unknown;

    if (Array.isArray(result)) {
      return (result[1] as bigint) ?? 0n;
    }

    if (result && typeof result === "object" && "deposit" in result) {
      return (result as { deposit?: bigint }).deposit ?? 0n;
    }

    return 0n;
  } catch {
    return 0n;
  }
}
