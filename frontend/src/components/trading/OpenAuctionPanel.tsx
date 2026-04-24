"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import {
  useApproveBktOpen,
  useBktAllowanceOpen,
  useConfirmReceivedOpen,
  useEndAuction,
  useOpenAuctionState,
  usePendingRefundOpen,
  usePlaceBid,
  useWithdrawRefund,
} from "@/hooks/useOpenAuction";
import { useAuth } from "@/hooks/useAuth";
import { useBidHistory } from "@/hooks/useBidHistory";
import { useInterestPreview } from "@/hooks/useInterest";
import { getContracts } from "@/config/contracts";
import BlockTokenABI from "@/abi/BlockToken.json";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import TxButton from "@/components/common/TxButton";
import CountdownTimer from "@/components/common/CountdownTimer";
import { formatBKT, truncateAddress } from "@/lib/utils";
import { parseTxError } from "@/lib/txError";

async function sendNotification(to: string, type: string, listingId: string, listingTitle: string, message: string) {
  await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, type, listingId, listingTitle, message }),
  }).catch(() => {});
}

function toBktValue(value: string) {
  try {
    return value ? parseEther(value as `${number}`) : 0n;
  } catch {
    return 0n;
  }
}

export default function OpenAuctionPanel({
  contractAddress,
  listingId,
  listingTitle,
}: {
  contractAddress: `0x${string}`;
  listingId?: bigint;
  listingTitle?: string;
}) {
  const { address } = useAccount();
  const { user } = useAuth();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const { endTime, highestBidder, highestBid, state, winner, seller, reservePrice } = useOpenAuctionState(contractAddress);
  const { data: allowanceRaw, refetch: refetchAllowance } = useBktAllowanceOpen(address, contractAddress);
  const { data: pendingRefundRaw, refetch: refetchPendingRefund } = usePendingRefundOpen(contractAddress, address);
  const { approve } = useApproveBktOpen(contractAddress);
  const { placeBid } = usePlaceBid(contractAddress);
  const { endAuction } = useEndAuction(contractAddress);
  const { withdraw } = useWithdrawRefund(contractAddress);
  const { confirm } = useConfirmReceivedOpen(contractAddress);
  const { bids, loading: bidsLoading } = useBidHistory(contractAddress);

  const [bidInput, setBidInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [txError, setTxError] = useState("");
  const [processing, setProcessing] = useState(false);

  const auctionState = (state.data as number) ?? 0;
  const endTimeBig = (endTime.data as bigint) ?? 0n;
  const highBid = (highestBid.data as bigint) ?? 0n;
  const highBidder = highestBidder.data as `0x${string}`;
  const winnerAddr = winner.data as `0x${string}`;
  const sellerAddr = seller.data as `0x${string}`;
  const reserveRaw = (reservePrice.data as bigint) ?? 0n;
  const allowance = (allowanceRaw as bigint) ?? 0n;
  const pendingRefund = (pendingRefundRaw as bigint) ?? 0n;
  const isWinner = address?.toLowerCase() === winnerAddr?.toLowerCase();
  const isHighBidder = address?.toLowerCase() === highBidder?.toLowerCase();
  const isSeller = address?.toLowerCase() === sellerAddr?.toLowerCase();
  const isExpired = endTimeBig > 0n && Date.now() / 1000 >= Number(endTimeBig);
  const canEndAuction = auctionState === 0 && isExpired && (isSeller || isHighBidder);
  const linkedWallet = user?.walletAddress?.toLowerCase();
  const isWalletMismatch = !!linkedWallet && !!address && linkedWallet !== address.toLowerCase();
  const bidWei = toBktValue(bidInput);

  const { data: feeRaw } = useInterestPreview(highBid);
  const fee = (feeRaw as bigint) ?? 0n;
  const sellerReceives = highBid > fee ? highBid - fee : 0n;

  const refetchAll = () => {
    state.refetch?.();
    highestBid.refetch?.();
    highestBidder.refetch?.();
    winner.refetch?.();
    refetchAllowance();
    refetchPendingRefund();
  };

  const handleBid = async () => {
    setTxError("");
    setProcessing(true);

    try {
      if (allowance < bidWei) {
        const approveHash = await approve();
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });

        const { blockToken } = getContracts(chainId);
        for (let index = 0; index < 10; index += 1) {
          const onChain = (await publicClient!.readContract({
            address: blockToken as `0x${string}`,
            abi: BlockTokenABI,
            functionName: "allowance",
            args: [address!, contractAddress],
          })) as bigint;

          if (onChain >= bidWei) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: OpenAuctionABI,
        functionName: "bid",
        args: [bidWei],
        account: address,
      });

      const gas = request.gas ? (request.gas * 130n) / 100n : 300000n;
      const bidHash = await placeBid(bidWei, gas);
      await publicClient!.waitForTransactionReceipt({ hash: bidHash });

      setBidInput("");
      refetchAll();

      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "open_bid",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `${formatBKT(bidWei)} 입찰이 등록되었습니다${listingTitle ? ` · ${listingTitle}` : ""}.`
        );
      }
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleEndAuction = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const hash = await endAuction();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const hash = await withdraw();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const hash = await confirm();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const bidDisabled =
    !bidInput ||
    !address ||
    bidWei === 0n ||
    bidWei <= highBid ||
    bidWei < reserveRaw ||
    processing ||
    isWalletMismatch;

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">현재 최고 입찰가</p>
          <p className="text-2xl font-bold" style={{ color: "#f0f0f8" }}>
            {highBid > 0n ? formatBKT(highBid) : "입찰 없음"}
          </p>
          {highBidder && highBid > 0n && (
            <p className="text-xs text-gray-400 mt-1">{isHighBidder ? "내가 최고 입찰자입니다." : truncateAddress(highBidder)}</p>
          )}
        </div>

        <div className="text-right">
          {auctionState === 0 && endTimeBig > 0n && (
            <>
              <p className="text-xs text-gray-400 mb-1">남은 시간</p>
              <CountdownTimer endTime={endTimeBig} />
            </>
          )}
          {auctionState === 1 && <span className="badge bg-amber-500/15 text-amber-400">정산 대기</span>}
          {auctionState === 2 && <span className="badge bg-gray-200/20 text-gray-500">거래 완료</span>}
        </div>
      </div>

      {reserveRaw > 0n && auctionState === 0 && (
        <div className="flex justify-between items-center text-xs px-1" style={{ color: "#565670" }}>
          <span>최소 입찰가</span>
          <span className="font-medium" style={{ color: "#a0a0bc" }}>
            {formatBKT(reserveRaw)}
          </span>
        </div>
      )}

      {bids.length > 0 && (
        <div>
          <button onClick={() => setShowHistory((prev) => !prev)} className="text-xs text-brand-500 hover:underline flex items-center gap-1">
            입찰 내역 {bids.length}건 {showHistory ? "숨기기" : "보기"}
          </button>

          {showHistory && (
            <div className="mt-2 rounded-xl border border-gray-100 divide-y divide-gray-50 max-h-40 overflow-y-auto">
              {bids.map((bid, index) => (
                <div key={index} className="flex justify-between items-center px-3 py-2 text-xs">
                  <span className="text-gray-500">{truncateAddress(bid.bidder)}</span>
                  <span className="font-medium text-gray-800">{formatBKT(bid.amount)}</span>
                </div>
              ))}

              {bidsLoading && (
                <div className="py-3 text-center">
                  <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isWalletMismatch && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
          로그인한 지갑과 현재 연결된 지갑이 다릅니다. 계정에 연결된 지갑으로 다시 연결해 주세요.
        </div>
      )}

      {auctionState === 0 && !isExpired &&
        (isSeller ? (
          <div className="rounded-xl px-4 py-3 text-xs text-center" style={{ background: "rgba(255,255,255,0.04)", color: "#565670" }}>
            판매자는 입찰할 수 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                step="1000"
                min="0"
                placeholder={`${highBid > 0n ? formatBKT(highBid, 0) : formatBKT(reserveRaw, 0)} 이상`}
                value={bidInput}
                onChange={(event) => setBidInput(event.target.value)}
                className="input-base flex-1"
              />
              <TxButton label="입찰하기" loading={processing} onClick={handleBid} disabled={bidDisabled} />
            </div>
            {!address && <p className="text-xs text-gray-400 text-center">지갑을 연결하면 입찰할 수 있습니다.</p>}
          </div>
        ))}

      {txError && <p className="text-xs text-red-500">{txError}</p>}

      {auctionState === 0 && isExpired &&
        (canEndAuction ? (
          <TxButton className="w-full" label="경매 종료 처리" loading={processing} onClick={handleEndAuction} disabled={isWalletMismatch} />
        ) : (
          <div className="rounded-xl px-4 py-3 text-xs text-center" style={{ background: "rgba(255,255,255,0.04)", color: "#565670" }}>
            경매 종료 처리는 판매자 또는 최고 입찰자만 할 수 있습니다.
          </div>
        ))}

      {auctionState === 1 && (
        <div className="space-y-3">
          {!winnerAddr || winnerAddr === "0x0000000000000000000000000000000000000000" ? (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 text-center">유효한 입찰이 없어 경매가 종료되었습니다.</div>
          ) : (
            <>
              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                낙찰자 {isWinner ? "본인" : truncateAddress(winnerAddr)} · {formatBKT(highBid)}
              </div>

              {highBid > 0n && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>낙찰가</span>
                    <span className="font-medium text-gray-700">{formatBKT(highBid)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>플랫폼 수수료 (2.5%)</span>
                    <span>- {formatBKT(fee)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-800 border-t border-gray-200 pt-1">
                    <span>판매자 수령액</span>
                    <span>{formatBKT(sellerReceives)}</span>
                  </div>
                </div>
              )}

              {isWinner ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">상품을 받았다면 수령 완료를 눌러 정산을 마무리해 주세요.</p>
                  <TxButton className="w-full" label="수령 완료 확인" loading={processing} onClick={handleConfirm} disabled={isWalletMismatch} />
                </div>
              ) : !isSeller && address ? (
                pendingRefund > 0n ? (
                  <TxButton
                    className="w-full"
                    variant="secondary"
                    label={`환급 받기 (${formatBKT(pendingRefund)})`}
                    loading={processing}
                    onClick={handleWithdraw}
                    disabled={isWalletMismatch}
                  />
                ) : (
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 text-center">환급 받을 금액이 없습니다.</div>
                )
              ) : null}
            </>
          )}
        </div>
      )}

      {auctionState === 2 && <p className="text-center text-sm text-gray-400 py-2">거래가 완료되었습니다.</p>}
    </div>
  );
}
