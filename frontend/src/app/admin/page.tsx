"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useChainId, useReadContracts } from "wagmi";
import { useListings } from "@/hooks/useMarketplace";
import { useTradeStates } from "@/hooks/useTradeStates";
import { useAdminResolve } from "@/hooks/useDirectSale";
import { getContracts } from "@/config/contracts";
import { parseTxError } from "@/lib/txError";
import { showToast } from "@/lib/toast";
import { formatBKT, truncateAddress } from "@/lib/utils";
import DirectSaleABI from "@/abi/DirectSale.json";
import OpenAuctionABI from "@/abi/OpenAuction.json";
import BlindAuctionABI from "@/abi/BlindAuction.json";
import type { Listing } from "@/types";

/* ─── 타입 ─── */
interface DisputedItem {
  listing: Listing;
  buyer:   string;
  seller:  string;
  price:   bigint;
}

/* ─── 분쟁 상세 모달 ─── */
function DisputeModal({
  item,
  onClose,
  onResolved,
}: {
  item: DisputedItem;
  onClose: () => void;
  onResolved: () => void;
}) {
  const publicClient = usePublicClient();
  const { adminResolve } = useAdminResolve(item.listing.tradeContract);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [txError, setTxError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handle = async (refundBuyer: boolean) => {
    if (!reason.trim()) {
      setTxError("결정 사유를 입력해 주세요.");
      return;
    }
    setTxError("");
    setProcessing(true);

    try {
      // 1) 온체인 실행
      const hash = await adminResolve(refundBuyer);
      await publicClient!.waitForTransactionReceipt({ hash });

      // 2) DB 로그 + 양측 알림
      await fetch("/api/admin/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: item.listing.tradeContract,
          listingId:       item.listing.id.toString(),
          listingTitle:    item.listing.title,
          seller:          item.seller,
          buyer:           item.buyer,
          price:           item.price.toString(),
          resolution:      refundBuyer ? "refund_buyer" : "pay_seller",
          reason:          reason.trim(),
        }),
      }).catch(() => {});

      showToast(
        refundBuyer
          ? `구매자 환불 완료 · ${item.listing.title}`
          : `판매자 정산 완료 · ${item.listing.title}`,
        "success"
      );
      onResolved();
    } catch (e) {
      setTxError(parseTxError(e));
      showToast("처리 중 오류가 발생했습니다.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-5"
        style={{ background: "#16162a", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#f0f0f8" }}>분쟁 중재</h2>
            <p className="text-xs mt-0.5" style={{ color: "#565670" }}>{item.listing.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 거래 정보 */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Row label="컨트랙트" value={truncateAddress(item.listing.tradeContract)} mono />
          <Row label="판매자"   value={truncateAddress(item.seller)} mono />
          <Row label="구매자"   value={truncateAddress(item.buyer)} mono />
          <Row label="금액"     value={formatBKT(item.price)} highlight />
        </div>

        {/* 결정 사유 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold" style={{ color: "#9ca3af" }}>결정 사유 <span style={{ color: "#f87171" }}>*</span></label>
          <textarea
            ref={textareaRef}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="판단 근거와 결정 이유를 입력하세요. 이 내용은 구매자·판매자 양측에 알림으로 전달됩니다."
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0f0f8",
            }}
          />
          {txError && <p className="text-xs text-red-400">{txError}</p>}
        </div>

        {/* 해결 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handle(true)}
            disabled={processing}
            className="rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }}
          >
            {processing ? "처리 중..." : "구매자 환불"}
            <span className="block text-xs font-normal mt-0.5" style={{ color: "#6366f1", opacity: 0.8 }}>판매자 귀책</span>
          </button>
          <button
            onClick={() => handle(false)}
            disabled={processing}
            className="rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "rgba(16,185,129,0.18)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            {processing ? "처리 중..." : "판매자 정산"}
            <span className="block text-xs font-normal mt-0.5" style={{ color: "#10b981", opacity: 0.8 }}>구매자 귀책</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs flex-shrink-0" style={{ color: "#565670" }}>{label}</span>
      <span
        className={`text-xs text-right ${mono ? "font-mono" : ""}`}
        style={{ color: highlight ? "#c4b5fd" : "#d1d5db" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── 분쟁 목록 ─── */
function DisputedList({
  listings,
  stateMap,
}: {
  listings: Listing[];
  stateMap: Record<string, number>;
}) {
  const [selected, setSelected] = useState<DisputedItem | null>(null);
  const [resolvedSet, setResolvedSet] = useState<Set<string>>(new Set());

  const disputed = listings.filter(
    (l) => l.saleType === 0 && stateMap[l.tradeContract.toLowerCase()] === 5
  );

  const active = disputed.filter((l) => !resolvedSet.has(l.tradeContract.toLowerCase()));

  const buyerContracts  = disputed.map((l) => ({ address: l.tradeContract as `0x${string}`, abi: DirectSaleABI as any, functionName: "buyer"  }));
  const sellerContracts = disputed.map((l) => ({ address: l.tradeContract as `0x${string}`, abi: DirectSaleABI as any, functionName: "seller" }));
  const priceContracts  = disputed.map((l) => ({ address: l.tradeContract as `0x${string}`, abi: DirectSaleABI as any, functionName: "price"  }));

  const { data: buyerData  } = useReadContracts({ contracts: buyerContracts  as any, query: { enabled: disputed.length > 0 } });
  const { data: sellerData } = useReadContracts({ contracts: sellerContracts as any, query: { enabled: disputed.length > 0 } });
  const { data: priceData  } = useReadContracts({ contracts: priceContracts  as any, query: { enabled: disputed.length > 0 } });

  const getItem = (l: Listing, i: number): DisputedItem => ({
    listing: l,
    buyer:   (buyerData?.[i]?.result  as string) ?? "",
    seller:  (sellerData?.[i]?.result as string) ?? "",
    price:   (priceData?.[i]?.result  as bigint) ?? 0n,
  });

  if (active.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <div className="text-3xl">✅</div>
        <p className="text-sm" style={{ color: "#565670" }}>현재 처리 대기 중인 분쟁이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {active.map((l) => {
          const idx = disputed.findIndex((d) => d.tradeContract === l.tradeContract);
          const item = getItem(l, idx);
          return (
            <div key={l.tradeContract} className="px-5 py-4 flex items-center gap-4">
              {/* 빨간 뱃지 */}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#f87171" }} />

              {/* 상품 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#f0f0f8" }}>{l.title}</p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-xs font-mono" style={{ color: "#565670" }}>판매자 {truncateAddress(item.seller)}</span>
                  <span className="text-xs" style={{ color: "#565670" }}>→</span>
                  <span className="text-xs font-mono" style={{ color: "#565670" }}>구매자 {truncateAddress(item.buyer)}</span>
                </div>
              </div>

              {/* 금액 */}
              <span className="text-sm font-semibold flex-shrink-0" style={{ color: "#c4b5fd" }}>
                {formatBKT(item.price)}
              </span>

              {/* 버튼 */}
              <button
                onClick={() => setSelected(item)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                분쟁 내용 보기
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <DisputeModal
          item={selected}
          onClose={() => setSelected(null)}
          onResolved={() => {
            setResolvedSet((prev) => new Set([...prev, selected.listing.tradeContract.toLowerCase()]));
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

/* ─── 거래 내역 ─── */
const SALE_TYPE_LABEL = ["즉시구매", "공개경매", "블라인드경매"];
const FEE_BPS = 250n;

function TxHistory({
  listings,
  stateMap,
}: {
  listings: Listing[];
  stateMap: Record<string, number>;
}) {
  const completed = listings.filter(
    (l) => stateMap[l.tradeContract.toLowerCase()] === 2
  );

  const counterpartyContracts = completed.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0 ? DirectSaleABI : l.saleType === 1 ? OpenAuctionABI : BlindAuctionABI) as any,
    functionName: l.saleType === 0 ? "buyer" : "winner",
  }));

  const amountContracts = completed.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0 ? DirectSaleABI : l.saleType === 1 ? OpenAuctionABI : BlindAuctionABI) as any,
    functionName: l.saleType === 0 ? "price" : l.saleType === 1 ? "highestBid" : "winningAmount",
  }));

  const { data: counterpartyData, isLoading: cpLoading } = useReadContracts({
    contracts: counterpartyContracts as any,
    query: { enabled: completed.length > 0 },
  });
  const { data: amountData, isLoading: amLoading } = useReadContracts({
    contracts: amountContracts as any,
    query: { enabled: completed.length > 0 },
  });

  if (cpLoading || amLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: "#565670" }}>
        완료된 거래가 없습니다.
      </div>
    );
  }

  const rows = completed.map((l, i) => {
    const counterparty = (counterpartyData?.[i]?.result as string) ?? "";
    const amount = (amountData?.[i]?.result as bigint) ?? 0n;
    const fee = (amount * FEE_BPS) / 10000n;
    const net = amount - fee;
    return { listing: l, counterparty, amount, fee, net };
  });

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0n);
  const totalFee    = rows.reduce((s, r) => s + r.fee, 0n);

  return (
    <div>
      {/* 합계 행 */}
      <div
        className="px-5 py-3 flex items-center justify-between text-xs font-semibold"
        style={{ background: "rgba(139,92,246,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ color: "#9ca3af" }}>총 {rows.length}건</span>
        <div className="flex gap-6">
          <span style={{ color: "#9ca3af" }}>
            거래총액 <span style={{ color: "#c4b5fd" }}>{formatBKT(totalAmount)}</span>
          </span>
          <span style={{ color: "#9ca3af" }}>
            누적 수수료 <span style={{ color: "#34d399" }}>{formatBKT(totalFee)}</span>
          </span>
        </div>
      </div>

      {/* 헤더 */}
      <div
        className="px-5 py-2 grid text-xs font-semibold"
        style={{
          gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr",
          color: "#565670",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span>상품명</span>
        <span>유형</span>
        <span>판매자</span>
        <span>구매자</span>
        <span className="text-right">거래금액</span>
        <span className="text-right">수수료(2.5%)</span>
        <span className="text-right">판매자 수령</span>
      </div>

      {/* 데이터 행 */}
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {rows.map(({ listing: l, counterparty, amount, fee, net }) => (
          <div
            key={l.tradeContract}
            className="px-5 py-3 grid items-center text-xs"
            style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr" }}
          >
            <span className="truncate pr-2 font-medium" style={{ color: "#f0f0f8" }}>
              {l.title}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-center w-fit"
              style={
                l.saleType === 0
                  ? { background: "rgba(96,165,250,0.15)", color: "#93c5fd" }
                  : l.saleType === 1
                  ? { background: "rgba(52,211,153,0.12)", color: "#6ee7b7" }
                  : { background: "rgba(251,191,36,0.12)", color: "#fcd34d" }
              }
            >
              {SALE_TYPE_LABEL[l.saleType]}
            </span>
            <span className="font-mono truncate" style={{ color: "#9ca3af" }}>
              {truncateAddress(l.seller)}
            </span>
            <span className="font-mono truncate" style={{ color: "#9ca3af" }}>
              {counterparty ? truncateAddress(counterparty) : "—"}
            </span>
            <span className="text-right font-semibold" style={{ color: "#c4b5fd" }}>
              {formatBKT(amount)}
            </span>
            <span className="text-right" style={{ color: "#34d399" }}>
              {formatBKT(fee)}
            </span>
            <span className="text-right" style={{ color: "#d1d5db" }}>
              {formatBKT(net)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 처리 완료 로그 ─── */
function DisputeHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dispute")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" /></div>;
  if (logs.length === 0) return <div className="py-8 text-center text-sm" style={{ color: "#565670" }}>처리 이력이 없습니다.</div>;

  return (
    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      {logs.map((log, i) => (
        <div key={i} className="px-5 py-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "#f0f0f8" }}>{log.listingTitle || truncateAddress(log.contractAddress)}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={log.resolution === "refund_buyer"
                ? { background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }
                : { background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}
            >
              {log.resolution === "refund_buyer" ? "구매자 환불" : "판매자 정산"}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#9ca3af" }}>{log.reason}</p>
          <p className="text-xs font-mono" style={{ color: "#565670" }}>
            {new Date(log.createdAt).toLocaleString("ko-KR")}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── 메인 ─── */
export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeTab, setActiveTab] = useState<"queue" | "txhistory" | "history">("queue");

  const { address } = useAccount();
  const chainId = useChainId();

  const { data: listingsRaw, isLoading } = useListings(0, 200);
  const listings = (listingsRaw as Listing[] | undefined) ?? [];
  const { stateMap, endTimeMap } = useTradeStates(listings);

  let platformAddress = "";
  try { platformAddress = getContracts(chainId).platform.toLowerCase(); } catch {}

  // 완료 거래 수수료 합산 (플랫폼 지갑 잔액 대신 실제 수수료만 계산)
  const completedListings = listings.filter(
    (l) => stateMap[l.tradeContract.toLowerCase()] === 2
  );
  const feeAmountContracts = completedListings.map((l) => ({
    address: l.tradeContract as `0x${string}`,
    abi: (l.saleType === 0 ? DirectSaleABI : l.saleType === 1 ? OpenAuctionABI : BlindAuctionABI) as any,
    functionName: l.saleType === 0 ? "price" : l.saleType === 1 ? "highestBid" : "winningAmount",
  }));
  const { data: feeAmountData } = useReadContracts({
    contracts: feeAmountContracts as any,
    query: { enabled: completedListings.length > 0 },
  });
  const totalAccruedFee = feeAmountData
    ? feeAmountData.reduce((sum, d) => {
        const amt = (d?.result as bigint) ?? 0n;
        return sum + (amt * 250n) / 10000n;
      }, 0n)
    : 0n;

  const now = Math.floor(Date.now() / 1000);

  const totalCount = listings.length;

  const activeCount = listings.filter((l) => {
    if (!l.active) return false;
    const key = l.tradeContract.toLowerCase();
    const s = stateMap[key];
    if (s === 2 || s === 3) return false;
    if ((l.saleType === 1 || l.saleType === 2) && s === 0) {
      const et = endTimeMap[key];
      if (et && et > 0n && Number(et) <= now) return false;
    }
    return true;
  }).length;

  const completedCount = listings.filter((l) => stateMap[l.tradeContract.toLowerCase()] === 2).length;
  const disputedCount  = listings.filter((l) => l.saleType === 0 && stateMap[l.tradeContract.toLowerCase()] === 5).length;

  if (!mounted) return null;

  const isAdmin = !!address && !!platformAddress && address.toLowerCase() === platformAddress;

  if (!address) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-gray-400">지갑을 연결해 주세요.</p>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-red-400">관리자 전용 페이지입니다.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f0f0f8" }}>관리자 대시보드</h1>
        <p className="text-xs mt-1" style={{ color: "#565670" }}>플랫폼 분쟁 중재 및 현황 모니터링</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "총 등록 상품", value: totalCount,    color: "#818cf8" },
          { label: "거래 중",      value: activeCount,   color: "#34d399" },
          { label: "거래 완료",    value: completedCount, color: "#60a5fa" },
          { label: "분쟁 대기",    value: disputedCount,  color: disputedCount > 0 ? "#f87171" : "#565670" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 space-y-1">
            <p className="text-xs" style={{ color: "#565670" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* 플랫폼 누적 수수료 */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "#565670" }}>플랫폼 누적 수수료 (BKT)</p>
          <p className="text-xl font-bold mt-1" style={{ color: "#34d399" }}>
            {isLoading || completedListings.length > 0 && !feeAmountData ? "—" : formatBKT(totalAccruedFee)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#3f3f60" }}>완료 거래 수수료 합산 (2.5%)</p>
        </div>
        <span className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#565670" }}>
          {truncateAddress(platformAddress as `0x${string}`)}
        </span>
      </div>

      {/* 탭 */}
      <div className="card overflow-hidden">
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {([
            { key: "queue",     label: "분쟁 대기", badge: disputedCount as number | undefined },
            { key: "txhistory", label: "거래 내역", badge: undefined },
            { key: "history",   label: "분쟁 처리 이력", badge: undefined },
          ] as const).map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{
                color: activeTab === key ? "#f0f0f8" : "#565670",
                borderBottom: activeTab === key ? "2px solid #8b5cf6" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "queue" ? (
          isLoading ? (
            <div className="py-12 text-center">
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <DisputedList listings={listings} stateMap={stateMap} />
          )
        ) : activeTab === "txhistory" ? (
          isLoading ? (
            <div className="py-12 text-center">
              <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <TxHistory listings={listings} stateMap={stateMap} />
          )
        ) : (
          <DisputeHistory />
        )}
      </div>
    </div>
  );
}
