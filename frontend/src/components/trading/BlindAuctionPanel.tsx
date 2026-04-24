"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import {
  makeCommitment,
  useApproveBktBlind,
  useBktAllowanceBlind,
  useBlindAuctionState,
  useCommitBid,
  useConfirmReceivedBlind,
  useFinalizeBlindAuction,
  useRevealBid,
} from "@/hooks/useBlindAuction";
import { useAuth } from "@/hooks/useAuth";
import { useInterestPreview } from "@/hooks/useInterest";
import { getContracts } from "@/config/contracts";
import BlockTokenABI from "@/abi/BlockToken.json";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import TxButton from "@/components/common/TxButton";
import CountdownTimer from "@/components/common/CountdownTimer";
import { formatBKT, truncateAddress } from "@/lib/utils";
import { parseTxError } from "@/lib/txError";

const STORAGE_KEY = (address: string) => `bk_blind_commit_${address.toLowerCase()}`;

interface SavedCommit {
  bidBkt: string;
  secret: string;
  depositBkt: string;
}

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

export default function BlindAuctionPanel({
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

  const { endTime, revealEndTime, state, winner, winningAmount, seller, reservePrice } = useBlindAuctionState(contractAddress);
  const { data: allowanceRaw, refetch: refetchAllowance } = useBktAllowanceBlind(address, contractAddress);
  const { approve } = useApproveBktBlind(contractAddress);
  const { commit } = useCommitBid(contractAddress);
  const { reveal } = useRevealBid(contractAddress);
  const { finalize } = useFinalizeBlindAuction(contractAddress);
  const { confirm } = useConfirmReceivedBlind(contractAddress);

  const [bidBkt, setBidBkt] = useState("");
  const [secret, setSecret] = useState("");
  const [deposit, setDeposit] = useState("");
  const [revealBid, setRevealBid] = useState("");
  const [revealSecret, setRevealSecret] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [txError, setTxError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY(contractAddress));
    if (!raw) return;

    try {
      const saved: SavedCommit = JSON.parse(raw);
      setRevealBid(saved.bidBkt);
      setRevealSecret(saved.secret);
    } catch {}
  }, [contractAddress]);

  const now = Math.floor(Date.now() / 1000);
  const endTimeBig = (endTime.data as bigint) ?? 0n;
  const revealEndBig = (revealEndTime.data as bigint) ?? 0n;
  const auctionState = (state.data as number) ?? 0;
  const winnerAddr = winner.data as `0x${string}`;
  const winAmount = (winningAmount.data as bigint) ?? 0n;
  const sellerAddr = seller.data as `0x${string}`;
  const reserveRaw = (reservePrice.data as bigint) ?? 0n;
  const allowance = (allowanceRaw as bigint) ?? 0n;
  const isWinner = address?.toLowerCase() === winnerAddr?.toLowerCase();
  const isSeller = address?.toLowerCase() === sellerAddr?.toLowerCase();
  const linkedWallet = user?.walletAddress?.toLowerCase();
  const isWalletMismatch = !!linkedWallet && !!address && linkedWallet !== address.toLowerCase();

  const bidWei = toBktValue(bidBkt);
  const depositWei = toBktValue(deposit);
  const revealBidWei = toBktValue(revealBid);

  const inCommit = auctionState === 0 && now < Number(endTimeBig);
  const inReveal = now >= Number(endTimeBig) && now < Number(revealEndBig);
  const canFinalize = now >= Number(revealEndBig) && auctionState === 0;

  const { data: feeRaw } = useInterestPreview(winAmount);
  const fee = (feeRaw as bigint) ?? 0n;
  const sellerReceives = winAmount > fee ? winAmount - fee : 0n;

  const phaseLabel = inCommit ? "입찰 제출 단계" : inReveal ? "입찰 공개 단계" : canFinalize ? "낙찰 확정 대기" : auctionState === 1 ? "정산 대기" : "거래 완료";
  const phaseBadge = inCommit ? "bg-brand-500/15 text-brand-400" : inReveal ? "bg-amber-500/15 text-amber-400" : "bg-gray-200/20 text-gray-500";

  const refetchAll = () => {
    state.refetch?.();
    winner.refetch?.();
    winningAmount.refetch?.();
    refetchAllowance();
  };

  const handleCommit = async () => {
    setTxError("");
    setProcessing(true);

    try {
      if (allowance < depositWei) {
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

          if (onChain >= depositWei) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const commitment = makeCommitment(bidBkt, secret);
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: BlindAuctionABI,
        functionName: "commit",
        args: [commitment, depositWei],
        account: address,
      });

      const gas = request.gas ? (request.gas * 130n) / 100n : 300000n;
      const commitHash = await commit(commitment, depositWei, gas);
      await publicClient!.waitForTransactionReceipt({ hash: commitHash });

      const saved: SavedCommit = { bidBkt, secret, depositBkt: deposit };
      localStorage.setItem(STORAGE_KEY(contractAddress), JSON.stringify(saved));
      setSavedNotice("입찰 정보가 브라우저에 저장되었습니다. 공개 단계에서 자동으로 불러옵니다.");
      refetchAll();

      if (sellerAddr) {
        await sendNotification(
          sellerAddr,
          "blind_bid",
          listingId?.toString() ?? "",
          listingTitle ?? "",
          `블라인드 입찰이 접수되었습니다${listingTitle ? ` · ${listingTitle}` : ""}.`
        );
      }
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleReveal = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const secretBytes = new TextEncoder().encode(revealSecret);
      const padded = new Uint8Array(32);
      padded.set(secretBytes.slice(0, 32));

      const revealHash = await reveal(revealBidWei, `0x${Buffer.from(padded).toString("hex")}` as `0x${string}`);
      await publicClient!.waitForTransactionReceipt({ hash: revealHash });
      refetchAll();
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalize = async () => {
    setTxError("");
    setProcessing(true);

    try {
      const hash = await finalize();
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
      localStorage.removeItem(STORAGE_KEY(contractAddress));
      refetchAll();
    } catch (error) {
      setTxError(parseTxError(error));
    } finally {
      setProcessing(false);
    }
  };

  const commitDisabled =
    !bidBkt ||
    !secret ||
    !deposit ||
    !address ||
    bidWei === 0n ||
    depositWei === 0n ||
    bidWei < reserveRaw ||
    depositWei < bidWei ||
    isWalletMismatch;

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">블라인드 경매 (Vickrey)</p>
          <p className="text-sm text-gray-600">낙찰자는 2등 가격만 지불합니다.</p>
        </div>
        <div className="text-right">
          <span className={`badge ${phaseBadge}`}>{phaseLabel}</span>
          {inCommit && endTimeBig > 0n && (
            <p className="text-xs text-gray-400 mt-1">
              <CountdownTimer endTime={endTimeBig} />
            </p>
          )}
          {inReveal && revealEndBig > 0n && (
            <p className="text-xs text-gray-400 mt-1">
              <CountdownTimer endTime={revealEndBig} />
            </p>
          )}
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

      {isWalletMismatch && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
          로그인한 지갑과 현재 연결된 지갑이 다릅니다. 계정에 연결된 지갑으로 다시 연결해 주세요.
        </div>
      )}

      {txError && <p className="text-xs text-red-500">{txError}</p>}

      {inCommit && isSeller && (
        <div className="rounded-xl px-4 py-3 text-xs text-center" style={{ background: "rgba(255,255,255,0.04)", color: "#565670" }}>
          판매자는 입찰할 수 없습니다.
        </div>
      )}

      {inCommit && !isSeller && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd" }}>
            실제 입찰가와 비밀값을 입력해 주세요. 공개 단계 전까지 입찰가는 공개되지 않습니다.
          </div>

          <input type="number" step="1000" min="0" placeholder="실제 입찰가 (BKT)" value={bidBkt} onChange={(event) => setBidBkt(event.target.value)} className="input-base" />
          <input type="text" placeholder="비밀값" value={secret} onChange={(event) => setSecret(event.target.value)} className="input-base" />
          <input
            type="number"
            step="1000"
            min="0"
            placeholder="보증금 (입찰가 이상)"
            value={deposit}
            onChange={(event) => setDeposit(event.target.value)}
            className="input-base"
          />

          {deposit && bidBkt && depositWei < bidWei && <p className="text-xs text-red-500">보증금은 실제 입찰가 이상이어야 합니다.</p>}

          <TxButton className="w-full" label="입찰 제출" loading={processing} disabled={commitDisabled} onClick={handleCommit} />

          {savedNotice && (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
              {savedNotice}
            </div>
          )}
        </div>
      )}

      {inReveal && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
            제출 단계에서 입력했던 입찰가와 비밀값을 그대로 입력해 주세요.
          </div>

          <input
            type="number"
            step="1000"
            min="0"
            placeholder="입찰가 (제출 단계와 동일)"
            value={revealBid}
            onChange={(event) => setRevealBid(event.target.value)}
            className="input-base"
          />
          <input
            type="text"
            placeholder="비밀값 (제출 단계와 동일)"
            value={revealSecret}
            onChange={(event) => setRevealSecret(event.target.value)}
            className="input-base"
          />

          <TxButton className="w-full" label="입찰 공개" loading={processing} disabled={!revealBid || !revealSecret || isWalletMismatch} onClick={handleReveal} />
        </div>
      )}

      {canFinalize && <TxButton className="w-full" label="낙찰 확정하기" loading={processing} onClick={handleFinalize} disabled={isWalletMismatch} />}

      {auctionState === 1 && (
        <div className="space-y-3">
          {!winnerAddr || winnerAddr === "0x0000000000000000000000000000000000000000" ? (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 text-center">
              유효한 입찰이 없어 경매가 종료되었습니다. 보증금은 모두 환급됩니다.
            </div>
          ) : (
            <>
              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                낙찰자 {isWinner ? "본인" : truncateAddress(winnerAddr)} · 낙찰가 {formatBKT(winAmount)}
              </div>

              {winAmount > 0n && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>낙찰가 (2등 가격)</span>
                    <span className="font-medium text-gray-700">{formatBKT(winAmount)}</span>
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

              {isWinner && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">상품을 받았다면 수령 완료를 눌러 정산을 마무리해 주세요.</p>
                  <TxButton className="w-full" label="수령 완료 확인" loading={processing} onClick={handleConfirm} disabled={isWalletMismatch} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {auctionState === 2 && <p className="text-center text-sm text-gray-400 py-2">거래가 완료되었습니다.</p>}
    </div>
  );
}
