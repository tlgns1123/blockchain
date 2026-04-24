"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decodeEventLog } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTradeFactory } from "@/hooks/useTradeFactory";
import MarketplaceABI from "@/abi/Marketplace.json";
import type { SaleType } from "@/types";
import { parseTxError } from "@/lib/txError";

const PENDING_EXTRA_IMAGES_KEY = "bk_pending_extra_images";

const SALE_TYPE_INFO = {
  0: {
    label: "즉시구매",
    icon: "🛒",
    desc: "구매자가 정해진 가격으로 바로 결제하는 방식입니다.",
    activeStyle: {
      borderColor: "rgba(52,211,153,0.6)",
      background: "rgba(52,211,153,0.08)",
      boxShadow: "0 0 0 2px rgba(52,211,153,0.2)",
    },
    idleStyle: { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" },
  },
  1: {
    label: "공개경매",
    icon: "🏷️",
    desc: "가장 높은 입찰가를 제시한 사용자가 낙찰받습니다.",
    activeStyle: {
      borderColor: "rgba(251,191,36,0.6)",
      background: "rgba(251,191,36,0.08)",
      boxShadow: "0 0 0 2px rgba(251,191,36,0.2)",
    },
    idleStyle: { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" },
  },
  2: {
    label: "블라인드 경매",
    icon: "🕶️",
    desc: "입찰가를 비공개로 제출하고, 2등 가격으로 결제하는 방식입니다.",
    activeStyle: {
      borderColor: "rgba(139,92,246,0.6)",
      background: "rgba(139,92,246,0.1)",
      boxShadow: "0 0 0 2px rgba(139,92,246,0.25)",
    },
    idleStyle: { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" },
  },
} as const;

async function saveExtraImages(listingId: string, images: string[]) {
  const response = await fetch("/api/listing-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, images }),
  });

  if (!response.ok) {
    throw new Error("extra-images-save-failed");
  }
}

function storePendingExtraImages(listingId: string, images: string[]) {
  if (typeof window === "undefined" || images.length === 0) return;
  localStorage.setItem(PENDING_EXTRA_IMAGES_KEY, JSON.stringify({ listingId, images }));
}

export default function SellPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address, isConnected, status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { user } = useAuth();
  const { createDirectSale, createOpenAuction, createBlindAuction, isPending } = useTradeFactory();

  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>(0);
  const [price, setPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [durationHours, setDurationHours] = useState("24");
  const [commitHours, setCommitHours] = useState("24");
  const [revealHours, setRevealHours] = useState("12");
  const [txHash, setTxHash] = useState<`0x${string}` | "">("");
  const [error, setError] = useState("");

  const linkedWallet = user?.walletAddress?.toLowerCase();
  const isWalletMismatch = !!linkedWallet && !!address && linkedWallet !== address.toLowerCase();

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (status !== "reconnecting" && status !== "connecting") {
      setReconnectTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => setReconnectTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!receipt) return;

    const finalize = async () => {
      let listingId = "";

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: MarketplaceABI as any,
            data: log.data,
            topics: log.topics,
          }) as { eventName: string; args: Record<string, unknown> };

          if (decoded.eventName === "ItemListed") {
            listingId = String(decoded.args.listingId ?? "");
            break;
          }
        } catch {}
      }

      const extraImages = images.slice(1);

      if (listingId && extraImages.length > 0) {
        let saved = false;

        for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
          try {
            await saveExtraImages(listingId, extraImages);
            saved = true;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          }
        }

        if (!saved) {
          storePendingExtraImages(listingId, extraImages);
        }
      }

      queryClient.invalidateQueries();
      router.push(listingId ? `/item/${listingId}` : "/marketplace");
    };

    void finalize();
  }, [receipt, images, queryClient, router]);

  const handleUpload = async (file: File) => {
    if (images.length >= 10) return;

    setImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "이미지 업로드에 실패했습니다.");
        return;
      }

      setImages((prev) => [...prev, data.url ?? data.hash]);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    try {
      let hash: `0x${string}`;

      if (saleType === 0) {
        hash = (await createDirectSale(title, description, images[0] ?? "", price)) as `0x${string}`;
      } else if (saleType === 1) {
        hash = (await createOpenAuction(
          title,
          description,
          images[0] ?? "",
          reservePrice,
          Number(durationHours) * 3600
        )) as `0x${string}`;
      } else {
        hash = (await createBlindAuction(
          title,
          description,
          images[0] ?? "",
          reservePrice,
          Number(commitHours) * 3600,
          Number(revealHours) * 3600
        )) as `0x${string}`;
      }

      setTxHash(hash);
    } catch (reason) {
      setError(parseTxError(reason));
    }
  };

  const canSubmit =
    title.trim() &&
    description.trim() &&
    (saleType === 0 ? !!price : !!reservePrice) &&
    !isWalletMismatch;

  if ((status === "reconnecting" || status === "connecting") && !reconnectTimedOut) {
    return (
      <div className="max-w-xl mx-auto pt-10">
        <div className="card p-10 text-center">
          <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">지갑 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-gray-500 mb-6">상품을 등록하려면 먼저 로그인해 주세요.</p>
          <Link href="/auth/login" className="btn-primary text-sm">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10 space-y-4">
          <p className="text-gray-500 text-sm">지갑이 연결되어 있지 않습니다.</p>
          <button onClick={openConnectModal} className="btn-primary text-sm w-full">
            지갑 다시 연결하기
          </button>
        </div>
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          {receipt ? (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">등록이 완료되었습니다</h2>
              <p className="text-sm text-gray-500 mb-2">상품 페이지로 이동 중입니다.</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">트랜잭션 처리 중...</h2>
              <p className="text-sm text-gray-500 mb-2">Sepolia 테스트넷에서 등록을 기다리고 있습니다.</p>
            </>
          )}

          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-500 underline"
          >
            트랜잭션 확인
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "#f0f0f8" }}>
        상품 등록
      </h1>
      <p className="text-sm mb-8" style={{ color: "#7878a0" }}>
        BKT로 거래할 상품을 등록해보세요.
      </p>

      <div className="space-y-5">
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold" style={{ color: "#f0f0f8" }}>
            상품 정보
          </h2>

          {isWalletMismatch && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
            >
              로그인한 지갑과 현재 연결된 지갑이 다릅니다. 계정에 연결된 지갑으로 다시 연결해 주세요.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              상품명 <span className="text-red-400">*</span>
            </label>
            <input
              className="input-base"
              placeholder="예: iPhone 15 Pro 256GB"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              상품 설명 <span className="text-red-400">*</span>
            </label>
            <textarea
              className="input-base resize-none"
              rows={4}
              placeholder="상품 상태, 구성품, 거래 조건 등을 입력해 주세요."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{description.length}/300</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              상품 이미지 <span className="text-gray-400 font-normal">(최대 10장, 첫 번째가 대표 이미지)</span>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {images.map((src, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                    <img
                      src={src.startsWith("/") ? src : `https://ipfs.io/ipfs/${src}`}
                      alt={`상품 이미지 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] bg-brand-500 text-white px-1 py-0.5 rounded font-bold">
                        대표
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 10 && (
              <label
                className="flex items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-all py-4"
                style={{
                  borderColor: imageUploading ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.12)",
                  background: imageUploading ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)",
                }}
              >
                {imageUploading ? (
                  <div className="flex items-center gap-2 text-brand-500 text-sm">
                    <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
                    업로드 중...
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">클릭해서 이미지를 추가하세요 ({images.length}/10)</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, GIF / 최대 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold" style={{ color: "#f0f0f8" }}>
            거래 방식
          </h2>

          <div className="space-y-2">
            {([0, 1, 2] as SaleType[]).map((type) => {
              const info = SALE_TYPE_INFO[type];
              const isActive = saleType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSaleType(type)}
                  className="w-full text-left p-4 rounded-xl border-2 transition-all"
                  style={isActive ? info.activeStyle : info.idleStyle}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{info.icon}</span>
                    <span className="font-semibold text-sm" style={{ color: "#f0f0f8" }}>
                      {info.label}
                    </span>
                    {isActive && <span className="ml-auto text-xs text-brand-400 font-medium">선택됨</span>}
                  </div>
                  <p className="text-xs" style={{ color: "#7878a0" }}>
                    {info.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pt-1 space-y-3">
            {saleType === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  판매가 (BKT) <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="100000"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            )}

            {(saleType === 1 || saleType === 2) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  최저 입찰가 (BKT) <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="10000"
                  value={reservePrice}
                  onChange={(event) => setReservePrice(event.target.value)}
                />
              </div>
            )}

            {saleType === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">경매 기간 (시간)</label>
                <input
                  className="input-base"
                  type="number"
                  min="1"
                  placeholder="24"
                  value={durationHours}
                  onChange={(event) => setDurationHours(event.target.value)}
                />
              </div>
            )}

            {saleType === 2 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">입찰 기간 (시간)</label>
                  <input
                    className="input-base"
                    type="number"
                    min="1"
                    placeholder="24"
                    value={commitHours}
                    onChange={(event) => setCommitHours(event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">공개 기간 (시간)</label>
                  <input
                    className="input-base"
                    type="number"
                    min="1"
                    placeholder="12"
                    value={revealHours}
                    onChange={(event) => setRevealHours(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="rounded-xl px-4 py-3 text-xs"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            color: "#c4b5fd",
          }}
        >
          등록 버튼을 누르면 거래 컨트랙트 배포와 마켓플레이스 등록이 하나의 트랜잭션으로 처리됩니다.
        </div>

        <div
          className="rounded-xl px-4 py-3 text-xs space-y-1"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.2)",
            color: "#fbbf24",
          }}
        >
          <p className="font-semibold">수수료 안내</p>
          <p>거래 완료 시 낙찰가 또는 판매가의 2.5%가 플랫폼 수수료로 차감됩니다.</p>
        </div>

        <button className="btn-primary w-full text-sm py-3" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? "처리 중..." : "마켓플레이스에 등록하기"}
        </button>
      </div>
    </div>
  );
}
