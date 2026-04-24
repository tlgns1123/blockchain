"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/hooks/useAuth";
import { getContracts } from "@/config/contracts";
import ExchangeABI from "@/abi/Exchange.json";
import BlockTokenABI from "@/abi/BlockToken.json";
import { parseTxError } from "@/lib/txError";

const RATE = 100_000_000n;

function formatBkt(raw: bigint) {
  return Number(formatUnits(raw, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function ExchangePage() {
  const { user } = useAuth();
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "reconnecting" && status !== "connecting") return;
    const t = setTimeout(() => setReconnectTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [status]);

  const contracts = (() => {
    try {
      return getContracts(chainId);
    } catch {
      return null;
    }
  })();

  const tokenAddress = contracts?.blockToken as `0x${string}` | undefined;
  const exchangeAddress = contracts?.exchange as `0x${string}` | undefined;
  const isDeployed = !!tokenAddress && tokenAddress !== "0x" && !!exchangeAddress && exchangeAddress !== "0x";

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [ethInput, setEthInput] = useState("");
  const [bktInput, setBktInput] = useState("");
  const [txError, setTxError] = useState("");
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const data = await res.json();
        setEthPrice(data?.ethereum?.usd ?? null);
      } catch {
        setEthPrice(null);
      } finally {
        setPriceLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  const { data: bktBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: BlockTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isDeployed },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: BlockTokenABI,
    functionName: "allowance",
    args: address && exchangeAddress ? [address, exchangeAddress] : undefined,
    query: { enabled: !!address && isDeployed },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance, refetchBalance]);

  const ethWei = (() => {
    try {
      return ethInput ? parseEther(ethInput) : 0n;
    } catch {
      return 0n;
    }
  })();

  const bktRaw = (() => {
    try {
      return bktInput ? parseUnits(bktInput, 18) : 0n;
    } catch {
      return 0n;
    }
  })();

  const bktFromEth = ethWei * RATE;
  const ethFromBkt = bktRaw / RATE;

  const handleBuy = () => {
    if (!ethWei || !exchangeAddress) return;
    setTxError("");
    writeContract(
      {
        address: exchangeAddress,
        abi: ExchangeABI,
        functionName: "exchange",
        value: ethWei,
      },
      { onError: (e) => setTxError(parseTxError(e)) }
    );
  };

  const handleApprove = () => {
    if (!bktRaw || !tokenAddress || !exchangeAddress) return;
    setTxError("");
    writeContract(
      {
        address: tokenAddress,
        abi: BlockTokenABI,
        functionName: "approve",
        args: [exchangeAddress, bktRaw],
      },
      { onError: (e) => setTxError(parseTxError(e)) }
    );
  };

  const handleRedeem = () => {
    if (!bktRaw || !exchangeAddress) return;
    setTxError("");
    writeContract(
      {
        address: exchangeAddress,
        abi: ExchangeABI,
        functionName: "redeem",
        args: [bktRaw],
      },
      { onError: (e) => setTxError(parseTxError(e)) }
    );
  };

  const needsApprove = tab === "sell" && bktRaw > 0n && ((allowance as bigint) ?? 0n) < bktRaw;
  const isLoading = isPending || isConfirming;

  if (!user) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <div className="card p-8 text-center">
          <p className="text-gray-500 text-sm mb-4">로그인이 필요한 서비스입니다.</p>
          <Link href="/auth/login" className="btn-primary text-sm">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if ((status === "reconnecting" || status === "connecting") && !reconnectTimedOut) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">지갑 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <div className="card p-8 text-center space-y-4">
          <p className="text-gray-500 text-sm">지갑 연결이 필요합니다.</p>
          <button onClick={openConnectModal} className="btn-primary text-sm w-full">
            지갑 다시 연결하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">환전소</h1>
        <p className="text-sm text-gray-500 mt-1">ETH를 BKT로 교환해 마켓플레이스 거래에 사용해 보세요.</p>
      </div>

      <div className="card p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">내 BKT 잔액</p>
          <p className="text-2xl font-bold text-brand-600">
            {bktBalance !== undefined ? formatBkt(bktBalance as bigint) : "--"}
            <span className="text-sm font-normal text-gray-500 ml-1">BKT</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">ETH 현재 시세</p>
          {priceLoading ? (
            <p className="text-sm font-medium text-gray-400">불러오는 중...</p>
          ) : ethPrice !== null ? (
            <>
              <p className="text-sm font-bold text-gray-800">${ethPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400">1 ETH / USD 기준</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">시세를 불러오지 못했습니다.</p>
          )}
        </div>
      </div>

      {!isDeployed && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}
        >
          환전 컨트랙트가 아직 배포되지 않았습니다.
          <br />
          <span className="text-xs">BlockToken과 Exchange 주소를 .env.local에 반영해 주세요.</span>
        </div>
      )}

      <div className="card p-6">
        <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === "buy" ? { background: "rgba(139,92,246,0.2)", color: "#c4b5fd", boxShadow: "0 0 12px rgba(139,92,246,0.2)" } : { color: "#565670" }}
            onClick={() => {
              setTab("buy");
              setTxError("");
            }}
          >
            ETH → BKT
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === "sell" ? { background: "rgba(139,92,246,0.2)", color: "#c4b5fd", boxShadow: "0 0 12px rgba(139,92,246,0.2)" } : { color: "#565670" }}
            onClick={() => {
              setTab("sell");
              setTxError("");
            }}
          >
            BKT → ETH
          </button>
        </div>

        {tab === "buy" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ETH 금액</label>
              <input type="number" step="0.001" min="0" className="input-base" placeholder="0.001" value={ethInput} onChange={(e) => setEthInput(e.target.value)} />
            </div>
            {ethWei > 0n && (
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                받게 되는 BKT: <strong>{formatBkt(bktFromEth)} BKT</strong>
              </div>
            )}
            {txError && <p className="text-xs text-red-500">{txError}</p>}
            {isSuccess && <p className="text-xs text-emerald-600">환전이 완료되었습니다.</p>}
            <button className="btn-primary w-full" disabled={!ethWei || isLoading || !isDeployed} onClick={handleBuy}>
              {isLoading ? "처리 중..." : "ETH로 BKT 구매"}
            </button>
          </div>
        )}

        {tab === "sell" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">BKT 금액</label>
              <input type="number" step="100000" min="0" className="input-base" placeholder="100000" value={bktInput} onChange={(e) => setBktInput(e.target.value)} />
              {bktBalance !== undefined && (
                <button className="text-xs text-brand-500 mt-1 hover:underline" onClick={() => setBktInput(formatUnits(bktBalance as bigint, 18))}>
                  최대: {formatBkt(bktBalance as bigint)} BKT
                </button>
              )}
            </div>
            {bktRaw > 0n && (
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                받게 되는 ETH: <strong>{formatEther(ethFromBkt)} ETH</strong>
              </div>
            )}
            {txError && <p className="text-xs text-red-500">{txError}</p>}
            {isSuccess && <p className="text-xs text-emerald-600">처리가 완료되었습니다.</p>}
            {needsApprove ? (
              <button className="btn-primary w-full" disabled={!bktRaw || isLoading || !isDeployed} onClick={handleApprove}>
                {isLoading ? "처리 중..." : "BKT 사용 승인"}
              </button>
            ) : (
              <button className="btn-primary w-full" disabled={!bktRaw || isLoading || !isDeployed} onClick={handleRedeem}>
                {isLoading ? "처리 중..." : "BKT를 ETH로 환전"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-700">BKT (Block Token)</strong>
        <br />
        블록마켓 전용 토큰으로 경매, 구매, 판매 거래에 사용됩니다.
        <br />
        환율: 0.001 ETH = 100,000 BKT (1 ETH = 100,000,000 BKT)
      </div>
    </div>
  );
}
