"use client";
import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  useDirectSaleState, useBktAllowance, useApproveBkt,
  usePurchase, useConfirmReceivedDirect, useCancelSale
} from "@/hooks/useDirectSale";
import { useDelistItem } from "@/hooks/useMarketplace";
import DirectSaleABI from "@/abi/DirectSale.json";
import TxButton from "@/components/common/TxButton";
import ReviewModal from "./ReviewModal";
import { formatBKT, truncateAddress } from "@/lib/utils";
import { parseTxError } from "@/lib/txError";

const STATE_LABEL = ["판매중", "구매 완료 대기중", "거래 완료", "취소됨"];
const STATE_COLOR = [
  "text-emerald-400 bg-emerald-500/15",
  "text-amber-400 bg-amber-500/15",
  "text-gray-500 bg-gray-200/10",
  "text-red-400 bg-red-500/15",
];

async function sendNotification(to: string, type: string, listingId: string, listingTitle: string, message: string) {
  await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, type, listingId, listingTitle, message }),
  }).catch(() => {});
}

export default function DirectSalePanel({
  contractAddress,
  listingId,
  listingTitle,
}: {
  contractAddress: `0x${string}`;
  listingId?: bigint;
  listingTitle?: string;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { price, buyer, seller, state } = useDirectSaleState(contractAddress);
  const { data: allowanceRaw, refetch: refetchAllowance } = useBktAllowance(address, contractAddress);
  const { approve } = useApproveBkt(contractAddress);
  const { purchase } = usePurchase(contractAddress);
  const { confirm } = useConfirmReceivedDirect(contractAddress);
  const { cancel } = useCancelSale(contractAddress);
  const { delistItem } = useDelistItem();

  const [showReview, setShowReview] = useState(false);
  const [txError, setTxError] = useState("");
  const [processing, setProcessing] = useState(false);

  const currentState = (state.data as number) ?? 0;
  const priceRaw     = (price.data as bigint) ?? 0n;
  const buyerAddr    = buyer.data as `0x${string}`;
  const sellerAddr   = seller.data as `0x${string}`;
  const allowance    = (allowanceRaw as bigint) ?? 0n;
  const isBuyer      = address?.toLowerCase() === buyerAddr?.toLowerCase();
  const isSeller     = address?.toLowerCase() === sellerAddr?.toLowerCase();

  const refetchAll = () => {
    state.refetch?.();
    buyer.refetch?.();
    price.refetch?.();
    refetchAllowance();
  };

  const handleCancel = async () => {
    setTxError("");
    setProcessing(true);
    try {
      const hash = await cancel();
      await publicClient!.waitForTransactionReceipt({ hash });
      if (listingId != null) await delistItem(listingId);
      refetchAll();
    } catch (e) { setTxError(parseTxError(e)); }
    finally { setProcessing(false); }
  };

  const handlePurchase = async () => {
    setTxError("");
    setProcessing(true);
    try {
      if (allowance < priceRaw) {
        const approveHash = await approve();
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: DirectSaleABI,
        functionName: "purchase",
        account: address,
      });
      const gas = request.gas ? (request.gas * 130n / 100n) : 300000n;
      const purchaseHash = await purchase(gas);
      await publicClient!.waitForTransactionReceipt({ hash: purchaseHash });
      refetchAll();
      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "purchase",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `구매자가 즉시구매${listingTitle ? ` '${listingTitle}'` : ""}를 완료했습니다. 수령 확인을 기다리고 있어요.`
        );
      }
    } catch (e) { setTxError(parseTxError(e)); }
    finally { setProcessing(false); }
  };

  const handleConfirm = async () => {
    setTxError("");
    setProcessing(true);
    try {
      const hash = await confirm();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();
      setShowReview(true);
      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "confirm",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `구매자가${listingTitle ? ` '${listingTitle}'` : ""} 수령을 완료했습니다. BKT가 전송됩니다.`
        );
      }
    } catch (e) { setTxError(parseTxError(e)); }
    finally { setProcessing(false); }
  };

  return (
    <>
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#565670" }}>판매가</p>
            <p className="text-2xl font-bold" style={{ color: "#f0f0f8" }}>{formatBKT(priceRaw)}</p>
          </div>
          <span className={`badge ${STATE_COLOR[currentState]}`}>
            {STATE_LABEL[currentState]}
          </span>
        </div>

        {currentState === 1 && buyerAddr && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
            구매자 {truncateAddress(buyerAddr)} 님이 구매했습니다. 수령 확인을 기다리는 중이에요.
          </div>
        )}

        {txError && <p className="text-xs text-red-500">{txError}</p>}

        {currentState === 0 && isSeller && (
          <TxButton
            className="w-full"
            variant="secondary"
            label="판매 취소"
            loading={processing}
            onClick={handleCancel}
          />
        )}

        {currentState === 0 && !isSeller && (
          <TxButton
            className="w-full"
            label={`${formatBKT(priceRaw)}로 바로 구매`}
            loading={processing}
            disabled={!address}
            onClick={handlePurchase}
          />
        )}

        {currentState === 1 && isBuyer && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              상품을 받으셨나요? 수령 완료를 눌러야 판매자에게 BKT가 전달됩니다.
            </p>
            <TxButton
              className="w-full"
              label="수령 완료 확인"
              loading={processing}
              onClick={handleConfirm}
            />
          </div>
        )}

        {currentState >= 2 && (
          <p className="text-center text-sm text-gray-400 py-2">{STATE_LABEL[currentState]}</p>
        )}

        {!address && currentState === 0 && (
          <p className="text-xs text-center text-gray-400">지갑을 연결하면 구매할 수 있어요.</p>
        )}
      </div>

      {showReview && listingId != null && (
        <ReviewModal
          listingId={listingId.toString()}
          reviewee={isBuyer ? sellerAddr : buyerAddr}
          role={isBuyer ? "buyer" : "seller"}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  );
}
