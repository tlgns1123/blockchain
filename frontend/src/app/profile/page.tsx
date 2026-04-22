"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useListings, useDelistItem } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useBoughtListings } from "@/hooks/useBoughtListings";
import { useTradeStates } from "@/hooks/useTradeStates";
import { truncateAddress } from "@/lib/utils";
import { SALE_TYPE_LABEL } from "@/types";
import type { Listing, SaleType } from "@/types";
import NicknameField from "@/components/common/NicknameField";
import PasswordRequirements from "@/components/common/PasswordRequirements";
import ItemCard from "@/components/marketplace/ItemCard";

const SALE_BADGE: Record<SaleType, string> = {
  0: "bg-emerald-500/15 text-emerald-400",
  1: "bg-amber-500/15 text-amber-400",
  2: "bg-brand-500/15 text-brand-400",
};

type Tab = "selling" | "buying" | "wishlist" | "settings";

const CONTRACT_STATE_LABEL: Record<number, { label: string; badge: string }> = {
  0: { label: "판매중", badge: "bg-emerald-500/15 text-emerald-400" },
  1: { label: "예약중", badge: "bg-amber-500/15 text-amber-400" },
  2: { label: "거래완료", badge: "bg-gray-200/15 text-gray-400" },
  3: { label: "취소됨", badge: "bg-red-500/15 text-red-400" },
};

// ─── 판매 내역 행 ────────────────────────────────────────────────────────────
function SaleRow({ listing, onDelist, delisting, contractState }: {
  listing: Listing;
  onDelist: (id: bigint) => void;
  delisting: boolean;
  contractState?: number;
}) {
  const stateInfo = contractState !== undefined
    ? (CONTRACT_STATE_LABEL[contractState] ?? CONTRACT_STATE_LABEL[0])
    : (listing.active ? { label: "판매중", badge: "bg-emerald-500/15 text-emerald-400" } : { label: "종료", badge: "bg-gray-200/15 text-gray-400" });

  return (
    <div className="flex items-center hover:bg-gray-50 transition rounded-xl">
      <Link href={`/item/${listing.id}`} className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0 cursor-pointer">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
          {listing.imageHash ? (
            <img
              src={listing.imageHash.startsWith("/") ? listing.imageHash : `https://ipfs.io/ipfs/${listing.imageHash}`}
              alt={listing.title} className="w-full h-full object-cover rounded-xl"
            />
          ) : "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{listing.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge ${SALE_BADGE[listing.saleType]}`}>{SALE_TYPE_LABEL[listing.saleType]}</span>
          <span className={`badge ${stateInfo.badge}`}>{stateInfo.label}</span>
        </div>
      </Link>
      {listing.active && contractState !== 2 && contractState !== 3 && (
        <div className="pr-4 flex-shrink-0">
          <button
            disabled={delisting}
            onClick={() => onDelist(listing.id)}
            className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
          >
            {delisting ? "처리중..." : "취소"}
          </button>
        </div>
      )}
      {listing.active && (contractState === 2 || contractState === 3) && (
        <div className="pr-4 flex-shrink-0">
          <button
            disabled={delisting}
            onClick={() => onDelist(listing.id)}
            className="text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            {delisting ? "처리중..." : "목록 제거"}
          </button>
        </div>
      )}
    </div>
  );
}

const BUY_STATE_LABEL: Record<number, { label: string; badge: string }> = {
  0: { label: "결제 대기", badge: "bg-emerald-500/15 text-emerald-400" },
  1: { label: "수령 대기", badge: "bg-amber-500/15 text-amber-400" },
  2: { label: "거래완료", badge: "bg-gray-200/15 text-gray-400" },
  3: { label: "취소됨", badge: "bg-red-500/15 text-red-400" },
};

// ─── 구매 내역 행 ────────────────────────────────────────────────────────────
function BuyRow({ listing, contractState }: { listing: Listing; contractState?: number }) {
  const stateInfo = contractState !== undefined
    ? (BUY_STATE_LABEL[contractState] ?? BUY_STATE_LABEL[1])
    : { label: "수령 대기", badge: "bg-amber-500/15 text-amber-400" };

  return (
    <Link href={`/item/${listing.id}`}>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition rounded-xl cursor-pointer">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
          {listing.imageHash ? (
            <img
              src={listing.imageHash.startsWith("/") ? listing.imageHash : `https://ipfs.io/ipfs/${listing.imageHash}`}
              alt={listing.title} className="w-full h-full object-cover rounded-xl"
            />
          ) : "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{listing.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge ${SALE_BADGE[listing.saleType]}`}>{SALE_TYPE_LABEL[listing.saleType]}</span>
          <span className={`badge ${stateInfo.badge}`}>{stateInfo.label}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── 설정 탭 ────────────────────────────────────────────────────────────────
function SettingsTab({ user, onUpdate }: {
  user: { id: string; email: string; nickname: string; walletAddress: string | null };
  onUpdate: () => void;
}) {
  const [nickname, setNickname] = useState(user.nickname);
  const [nicknameAvailable, setNicknameAvailable] = useState(true);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [nickMsg, setNickMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [nickLoading, setNickLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameAvailable) return;
    setNickLoading(true);
    setNickMsg("");
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    setNickMsg(res.ok ? "닉네임이 변경됐습니다." : data.error);
    if (res.ok) onUpdate();
    setNickLoading(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg("새 비밀번호가 일치하지 않습니다."); return; }
    setPwLoading(true);
    setPwMsg("");
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg("비밀번호가 변경됐습니다.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setPwMsg(data.error);
    }
    setPwLoading(false);
  };

  return (
    <div className="divide-y divide-gray-50">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">계정 정보</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">이메일</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">지갑 주소</dt>
            <dd>
              {user.walletAddress ? (
                <a href={`https://sepolia.etherscan.io/address/${user.walletAddress}`} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline text-xs">
                  {truncateAddress(user.walletAddress)}
                </a>
              ) : (
                <span className="text-xs text-gray-400">미연결 (로그인 시 연결)</span>
              )}
            </dd>
          </div>
        </dl>
        {user.walletAddress && (
          <p className="text-xs text-gray-400 mt-3">지갑 주소는 보안상 변경할 수 없습니다.</p>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">닉네임 변경</h3>
        <form onSubmit={handleNickname} className="space-y-3">
          <NicknameField
            value={nickname}
            onChange={setNickname}
            excludeId={user.id}
            onAvailableChange={(v) => {
              setNicknameAvailable(nickname === user.nickname ? true : v);
            }}
          />
          {nickMsg && (
            <p className={`text-xs flex items-center gap-1 ${nickMsg.includes("됐") ? "text-emerald-600" : "text-red-500"}`}>
              <span>{nickMsg.includes("됐") ? "✓" : "✕"}</span>{nickMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={nickLoading || nickname === user.nickname || !nicknameAvailable}
            className="btn-primary text-sm"
          >
            {nickLoading ? "저장 중..." : "저장"}
          </button>
        </form>
      </div>

      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">비밀번호 변경</h3>
        <form onSubmit={handlePassword} className="space-y-3">
          <input type="password" className="input-base" placeholder="현재 비밀번호" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          <div>
            <input type="password" className="input-base" placeholder="새 비밀번호" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            <PasswordRequirements value={newPw} />
          </div>
          <div>
            <input type="password" className="input-base" placeholder="새 비밀번호 확인" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
            {confirmPw && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${newPw === confirmPw ? "text-emerald-600" : "text-red-500"}`}>
                <span>{newPw === confirmPw ? "✓" : "✕"}</span>
                {newPw === confirmPw ? "비밀번호가 일치해요." : "비밀번호가 일치하지 않아요."}
              </p>
            )}
          </div>
          {pwMsg && (
            <p className={`text-xs flex items-center gap-1 ${pwMsg.includes("됐") ? "text-emerald-600" : "text-red-500"}`}>
              <span>{pwMsg.includes("됐") ? "✓" : "✕"}</span>{pwMsg}
            </p>
          )}
          <button type="submit" disabled={pwLoading || !currentPw || !newPw || !confirmPw} className="btn-primary text-sm">
            {pwLoading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { address } = useAccount();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("selling");

  const { data: allListings, isLoading: listingsLoading, refetch: refetchListings } = useListings(0, 100);
  const { delistItem, isPending: delisting } = useDelistItem();
  const { ids: wishlistIds, toggle: toggleWishlist, isWishlisted } = useWishlist();
  const userAddr = user?.walletAddress ?? address;

  const { bought, isLoading: buyingLoading } = useBoughtListings(
    allListings as Listing[] | undefined,
    userAddr ?? undefined
  );

  // 판매/구매 내역 컨트랙트 상태
  const myListingsForState = (allListings as Listing[] | undefined)?.filter(
    (l) => l.seller?.toLowerCase() === userAddr?.toLowerCase()
  ) ?? [];
  const { stateMap: saleStateMap } = useTradeStates(myListingsForState);
  const { stateMap: buyStateMap } = useTradeStates(bought);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요해요</h2>
          <p className="text-sm text-gray-500 mb-6">내 활동 내역을 보려면 로그인해주세요.</p>
          <Link href="/auth/login" className="btn-primary text-sm">로그인하기</Link>
        </div>
      </div>
    );
  }

  const myListings = (allListings as Listing[] | undefined)?.filter(
    (l) => l.seller?.toLowerCase() === userAddr?.toLowerCase()
  ) ?? [];

  const wishlistedListings = (allListings as Listing[] | undefined)?.filter(
    (l) => isWishlisted(l.id.toString())
  ) ?? [];

  const TABS: { key: Tab; label: string; count: number | null }[] = [
    { key: "selling", label: "판매 내역", count: myListings.length },
    { key: "buying",  label: "구매 내역", count: bought.length },
    { key: "wishlist", label: "찜 목록",  count: wishlistIds.length },
    { key: "settings", label: "설정",     count: null },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* 프로필 헤더 */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
          {user.nickname.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-base">{user.nickname}</p>
          <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-brand-50 text-brand-600">Sepolia</span>
            {user.walletAddress && (
              <a href={`https://sepolia.etherscan.io/address/${user.walletAddress}`} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-gray-600 transition">
                {truncateAddress(user.walletAddress)} →
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{myListings.length}</p>
          <p className="text-xs text-gray-400">등록 상품</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={tab === key
              ? { background: "rgba(139,92,246,0.2)", color: "#c4b5fd", boxShadow: "0 0 12px rgba(139,92,246,0.2)" }
              : { color: "#565670" }
            }
          >
            {label}
            {count !== null && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={tab === key
                  ? { background: "rgba(139,92,246,0.25)", color: "#c4b5fd" }
                  : { background: "rgba(255,255,255,0.08)", color: "#565670" }
                }
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="card overflow-hidden">
        {/* 판매 내역 */}
        {tab === "selling" && (
          listingsLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-400">불러오는 중...</p>
            </div>
          ) : myListings.length === 0 ? (
            <div>
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-gray-400">아직 등록한 상품이 없어요.</p>
              </div>
              <div className="pb-8 text-center">
                <Link href="/sell" className="btn-primary text-sm">첫 상품 등록하기</Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myListings.map((listing) => (
                <SaleRow
                  key={String(listing.id)}
                  listing={listing}
                  delisting={delisting}
                  contractState={saleStateMap[listing.tradeContract.toLowerCase()]}
                  onDelist={async (id) => { await delistItem(id); refetchListings(); }}
                />
              ))}
            </div>
          )
        )}

        {/* 구매 내역 */}
        {tab === "buying" && (
          buyingLoading || listingsLoading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-400">불러오는 중...</p>
            </div>
          ) : bought.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-sm text-gray-400">아직 구매한 상품이 없어요.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bought.map((listing) => (
                <BuyRow key={String(listing.id)} listing={listing} contractState={buyStateMap[listing.tradeContract.toLowerCase()]} />
              ))}
            </div>
          )
        )}

        {/* 찜 목록 */}
        {tab === "wishlist" && (
          wishlistedListings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🤍</div>
              <p className="text-sm text-gray-400">찜한 상품이 없어요.</p>
              <p className="text-xs text-gray-400 mt-1">마켓플레이스에서 마음에 드는 상품을 찜해보세요.</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wishlistedListings.map((listing) => (
                <ItemCard
                  key={String(listing.id)}
                  listing={listing}
                  wishlisted={true}
                  onWishlistToggle={toggleWishlist}
                />
              ))}
            </div>
          )
        )}

        {/* 설정 */}
        {tab === "settings" && (
          <SettingsTab user={user} onUpdate={() => qc.invalidateQueries({ queryKey: ["me"] })} />
        )}
      </div>
    </div>
  );
}
