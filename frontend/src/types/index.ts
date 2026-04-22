export type SaleType = 0 | 1 | 2; // 0: DirectSale, 1: OpenAuction, 2: BlindAuction
export const SALE_TYPE_LABEL: Record<SaleType, string> = {
  0: "즉시구매",
  1: "공개경매",
  2: "블라인드경매",
};

export interface Listing {
  id: bigint;
  seller: `0x${string}`;
  title: string;
  description: string;
  imageHash: string; // IPFS hash
  saleType: SaleType;
  tradeContract: `0x${string}`;
  active: boolean;
}

export interface DirectSaleState {
  price: bigint;
  buyer: `0x${string}`;
  state: 0 | 1 | 2 | 3; // OnSale, Locked, Completed, Cancelled
}

export interface OpenAuctionState {
  endTime: bigint;
  highestBidder: `0x${string}`;
  highestBid: bigint;
  reservePrice: bigint;
  state: 0 | 1 | 2; // Active, Ended, Finalized
  winner: `0x${string}`;
  winningAmount: bigint;
}

export interface BlindAuctionState {
  endTime: bigint;        // commit 마감
  revealEndTime: bigint;  // reveal 마감
  state: 0 | 1 | 2;      // Active, Ended, Finalized
  winner: `0x${string}`;
  winningAmount: bigint;
  reservePrice: bigint;
}
