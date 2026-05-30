"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  useApproveBkt,
  useAgreeCancel,
  useBktAllowance,
  useCancelSale,
  useConfirmReceivedDirect,
  useDirectSaleState,
  useMutualCancelState,
  usePurchase,
  useRaiseDispute,
} from "@/hooks/useDirectSale";
import { useAuth } from "@/hooks/useAuth";
import { useDelistItem } from "@/hooks/useMarketplace";
import DirectSaleABI from "@/abi/DirectSale.json";
import TxButton from "@/components/common/TxButton";
import ReviewModal from "./ReviewModal";
import { formatBKT, truncateAddress } from "@/lib/utils";
import { parseTxError } from "@/lib/txError";
import { showToast } from "@/lib/toast";
import { useBktBalance } from "@/hooks/useToken";

const STATE_LABEL = ["판매중", "구매 확정 대기", "거래 완료", "취소됨", "상호 취소됨", "분쟁 중"];
const STATE_COLOR = [
  "text-emerald-400 bg-emerald-500/15",
  "text-amber-400 bg-amber-500/15",
  "text-gray-500 bg-gray-200/10",
  "text-red-400 bg-red-500/15",
  "text-orange-400 bg-orange-500/15",
  "text-red-400 bg-red-500/20",
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
  onReviewDone,
}: {
  contractAddress: `0x${string}`;
  listingId?: bigint;
  listingTitle?: string;
  onReviewDone?: () => void;
}) {
  const { address } = useAccount();
  const { user } = useAuth();
  const publicClient = usePublicClient();
  const { price, buyer, seller, state } = useDirectSaleState(contractAddress);
  const { data: allowanceRaw, refetch: refetchAllowance } = useBktAllowance(address, contractAddress);
  const { data: bktBalanceRaw, refetch: refetchBktBalance } = useBktBalance(address);
  const { approve } = useApproveBkt(contractAddress);
  const { purchase } = usePurchase(contractAddress);
  const { confirm } = useConfirmReceivedDirect(contractAddress);
  const { cancel } = useCancelSale(contractAddress);
  const { agreeCancel } = useAgreeCancel(contractAddress);
  const { sellerAgree, buyerAgree } = useMutualCancelState(contractAddress);
  const { raiseDispute } = useRaiseDispute(contractAddress);
  const { delistItem } = useDelistItem();

  const [showReview, setShowReview] = useState(false);
  const [txError, setTxError] = useState("");
  const [processing, setProcessing] = useState(false);

  const currentState = (state.data as number) ?? 0;
  const priceRaw = (price.data as bigint) ?? 0n;
  const buyerAddr = buyer.data as `0x${string}`;
  const sellerAddr = seller.data as `0x${string}`;
  const allowance = (allowanceRaw as bigint) ?? 0n;
  const bktBalance = (bktBalanceRaw as bigint) ?? 0n;
  const isBuyer = address?.toLowerCase() === buyerAddr?.toLowerCase();
  const isSeller = address?.toLowerCase() === sellerAddr?.toLowerCase();
  const sellerAgreed = (sellerAgree.data as boolean) ?? false;
  const buyerAgreed  = (buyerAgree.data as boolean) ?? false;
  const myAgree = isSeller ? sellerAgreed : isBuyer ? buyerAgreed : false;
  const hasBkt = bktBalance >= priceRaw;
  const linkedWallet = user?.walletAddress?.toLowerCase();
  const isWalletMismatch = !!linkedWallet && !!address && linkedWallet !== address.toLowerCase();

  const refetchAll = () => {
    state.refetch?.();
    buyer.refetch?.();
    price.refetch?.();
    sellerAgree.refetch?.();
    buyerAgree.refetch?.();
    refetchAllowance();
    refetchBktBalance();
  };

  const handleCancel = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const hash = await cancel();
      await publicClient!.waitForTransactionReceipt({ hash });

      if (listingId != null) await delistItem(listingId);

      refetchAll();
      showToast("판매가 취소되었습니다.", "info");

      if (buyerAddr && buyerAddr !== "0x0000000000000000000000000000000000000000") {
        await sendNotification(buyerAddr, "cancel", listingId?.toString() ?? "", listingTitle ?? "", `판매자가 판매를 취소했습니다${listingTitle ? ` · ${listingTitle}` : ""}.`);
      }
    } catch (error) {
      setTxError(parseTxError(error));
      showToast("취소 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setProcessing(false);
    }
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

      const gas = request.gas ? (request.gas * 130n) / 100n : 300000n;
      const purchaseHash = await purchase(gas);
      await publicClient!.waitForTransactionReceipt({ hash: purchaseHash });
      refetchAll();
      showToast("구매가 완료되었습니다!", "success");

      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "purchase",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `즉시 구매가 완료되었습니다${listingTitle ? ` · ${listingTitle}` : ""}.`
        );
      }
    } catch (error) {
      setTxError(parseTxError(error));
      showToast("구매 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleAgreeCancel = async () => {
    setTxError("");
    setProcessing(true);
    try {
      const hash = await agreeCancel();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();

      const oppositeAddr = isSeller ? buyerAddr : sellerAddr;
      const newSellerAgreed = isSeller ? true : sellerAgreed;
      const newBuyerAgreed  = isBuyer  ? true : buyerAgreed;

      if (newSellerAgreed && newBuyerAgreed) {
        if (listingId != null) await delistItem(listingId);
        showToast("상호 합의 취소 완료. BKT가 구매자에게 환불되었습니다.", "info");
        await sendNotification(oppositeAddr, "cancel", listingId?.toString() ?? "", listingTitle ?? "", `상호 합의로 거래가 취소되어 BKT가 환불되었습니다${listingTitle ? ` · ${listingTitle}` : ""}.`);
      } else {
        showToast("취소 요청을 보냈습니다. 상대방이 동의하면 환불됩니다.", "info");
        await sendNotification(oppositeAddr, "cancel", listingId?.toString() ?? "", listingTitle ?? "", `상대방이 거래 취소를 요청했습니다${listingTitle ? ` · ${listingTitle}` : ""}. 동의하면 BKT가 환불됩니다.`);
      }
    } catch (error) {
      setTxError(parseTxError(error));
      showToast("취소 요청 중 오류가 발생했습니다.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRaiseDispute = async () => {
    setTxError("");
    setProcessing(true);
    try {
      const hash = await raiseDispute();
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchAll();
      showToast("분쟁이 접수되었습니다. 관리자가 검토 후 처리합니다.", "info");
      const oppositeAddr = isSeller ? buyerAddr : sellerAddr;
      await sendNotification(oppositeAddr, "dispute", listingId?.toString() ?? "", listingTitle ?? "", `상대방이 분쟁을 신청했습니다${listingTitle ? ` · ${listingTitle}` : ""}. 관리자가 중재합니다.`);
    } catch (error) {
      setTxError(parseTxError(error));
      showToast("분쟁 신청 중 오류가 발생했습니다.", "error");
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
      setShowReview(true);
      showToast("수령 확인 완료! 리뷰를 남겨 주세요.", "success");

      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "confirm",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `구매자가 수령 완료를 확인했습니다${listingTitle ? ` · ${listingTitle}` : ""}.`
        );
      }
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs mb-1" style={{ color: "#565670" }}>
              판매가
            </p>
            <p className="text-2xl font-bold" style={{ color: "#f0f0f8" }}>
              {formatBKT(priceRaw)}
            </p>
          </div>
          <span className={`badge ${STATE_COLOR[currentState]}`}>{STATE_LABEL[currentState]}</span>
        </div>

        {isWalletMismatch && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
            로그인한 지갑과 현재 연결된 지갑이 다릅니다. 계정에 연결된 지갑으로 다시 연결해 주세요.
          </div>
        )}

        {currentState === 1 && buyerAddr && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
            구매자 {truncateAddress(buyerAddr)} 님이 결제를 완료했습니다. 수령 확인을 기다리는 중입니다.
          </div>
        )}

        {txError && <p className="text-xs text-red-500">{txError}</p>}

        {currentState === 0 && isSeller && (
          <TxButton className="w-full" variant="secondary" label="판매 취소" loading={processing} onClick={handleCancel} disabled={isWalletMismatch} />
        )}

        {currentState === 0 && !isSeller && address && !hasBkt && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
            BKT 잔액이 부족합니다.{" "}
            <a href="/exchange" className="underline font-semibold" style={{ color: "#f59e0b" }}>
              교환소에서 충전하기 →
            </a>
          </div>
        )}
        {currentState === 0 && !isSeller && (
          <TxButton
            className="w-full"
            label={`${formatBKT(priceRaw)}로 바로 구매`}
            loading={processing}
            disabled={!address || isWalletMismatch || !hasBkt}
            onClick={handlePurchase}
          />
        )}

        {currentState === 1 && isBuyer && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">상품을 받았다면 수령 완료를 눌러 판매자에게 BKT를 정산해 주세요.</p>
            <TxButton className="w-full" label="수령 완료 확인" loading={processing} onClick={handleConfirm} disabled={isWalletMismatch} />
          </div>
        )}

        {currentState === 1 && (isBuyer || isSeller) && (
          <div className="rounded-xl px-4 py-3 space-y-3" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p className="text-xs font-semibold" style={{ color: "#fb923c" }}>상호 합의 취소</p>
            <div className="flex gap-3 text-xs" style={{ color: "#9ca3af" }}>
              <span>판매자 {sellerAgreed ? "✅" : "⬜"}</span>
              <span>구매자 {buyerAgreed  ? "✅" : "⬜"}</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              양측이 모두 동의하면 BKT가 구매자에게 즉시 환불됩니다.
            </p>
            {myAgree ? (
              <p className="text-xs" style={{ color: "#fb923c" }}>취소 요청을 보냈습니다. 상대방의 동의를 기다리는 중...</p>
            ) : (
              <TxButton
                className="w-full"
                variant="secondary"
                label="취소 동의"
                loading={processing}
                onClick={handleAgreeCancel}
                disabled={isWalletMismatch}
              />
            )}
          </div>
        )}

        {currentState === 1 && (isBuyer || isSeller) && (
          <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-xs font-semibold" style={{ color: "#f87171" }}>분쟁 신청</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              상호합의가 되지 않는다면 관리자에게 중재를 요청할 수 있습니다.
            </p>
            <TxButton
              className="w-full"
              variant="secondary"
              label="관리자 중재 요청"
              loading={processing}
              onClick={handleRaiseDispute}
              disabled={isWalletMismatch}
            />
          </div>
        )}

        {currentState === 5 && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
            분쟁이 접수되었습니다. 관리자 검토 후 처리됩니다.
          </div>
        )}

        {currentState >= 2 && currentState !== 5 && <p className="text-center text-sm text-gray-400 py-2">{STATE_LABEL[currentState]}</p>}

        {!address && currentState === 0 && <p className="text-xs text-center text-gray-400">지갑을 연결하면 구매할 수 있습니다.</p>}
      </div>

      {showReview && listingId != null && (
        <ReviewModal
          listingId={listingId.toString()}
          reviewee={isBuyer ? sellerAddr : buyerAddr}
          role={isBuyer ? "buyer" : "seller"}
          onClose={() => setShowReview(false)}
          onDone={onReviewDone}
        />
      )}
    </>
  );
}
