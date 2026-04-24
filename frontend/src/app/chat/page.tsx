"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { ChatRoom, useChatMessages, useChatRooms, useMarkRead, useSendMessage } from "@/hooks/useChat";
import MarketplaceABI from "@/abi/Marketplace.json";
import { getContracts } from "@/config/contracts";
import { truncateAddress } from "@/lib/utils";

const MAX_MSG_LEN = 300;

function MessageView({ room, myAddr }: { room: ChatRoom; myAddr: string }) {
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, refetch } = useChatMessages(room.listingId, room.peer, true);
  const { send, sending } = useSendMessage();
  const markRead = useMarkRead();

  useEffect(() => {
    const t = setTimeout(() => markRead(room.listingId, room.peer), 1500);
    return () => clearTimeout(t);
  }, [room.listingId, room.peer, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (input.trim().length > MAX_MSG_LEN) {
      setSendError(`메시지는 ${MAX_MSG_LEN}자 이하로 입력해 주세요.`);
      return;
    }
    setSendError("");
    const ok = await send(room.listingId, room.peer, input.trim());
    if (ok) {
      setInput("");
      refetch();
    } else {
      setSendError("전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-white text-xs font-bold">
          {(room.peerNickname ?? room.peer).slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{room.peerNickname ?? truncateAddress(room.peer)}</p>
          <p className="text-xs text-gray-400">Listing #{room.listingId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.length === 0 && <p className="text-center text-xs text-gray-400 mt-8">첫 메시지를 보내 보세요.</p>}
        {messages.map((msg) => {
          const isMine = msg.from === myAddr.toLowerCase();
          return (
            <div key={msg._id} className={`flex items-end gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
              {isMine && !msg.read && <span className="text-[10px] text-brand-400 font-bold mb-1">1</span>}
              <div
                className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMine ? "bg-brand-500 text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content}
                <p className={`text-[10px] mt-0.5 ${isMine ? "text-brand-200" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-1.5">
        {sendError && <p className="text-xs text-red-500">{sendError}</p>}
        <div className="flex gap-2">
          <input
            className="input-base flex-1 text-sm py-2"
            placeholder="메시지 입력..."
            value={input}
            maxLength={MAX_MSG_LEN}
            onChange={(e) => {
              setInput(e.target.value);
              if (sendError) setSendError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button onClick={() => void handleSend()} disabled={sending || !input.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
            전송
          </button>
        </div>
        {input.length > MAX_MSG_LEN * 0.8 && <p className="text-[10px] text-gray-400 text-right">{input.length}/{MAX_MSG_LEN}</p>}
      </div>
    </div>
  );
}

function RoomItem({
  room,
  selected,
  onClick,
  listingTitle,
}: {
  room: ChatRoom;
  selected: boolean;
  onClick: () => void;
  listingTitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 ${
        selected ? "bg-brand-50 border-l-2 border-brand-500" : "border-l-2 border-transparent"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5">
        {(room.peerNickname ?? room.peer).slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{room.peerNickname ?? truncateAddress(room.peer)}</p>
          {room.lastMessage?.createdAt && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {new Date(room.lastMessage.createdAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{listingTitle ? `[${listingTitle}] ` : ""}{room.lastMessage?.content ?? "대화를 시작해 보세요."}</p>
      </div>
      {room.unread > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {room.unread}
        </span>
      )}
    </button>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const filterListingId = searchParams.get("listingId");
  const filterPeer = searchParams.get("peer");

  const { address } = useAccount();
  const { user } = useAuth();
  const chainId = useChainId();
  const myAddr = user?.walletAddress ?? address ?? "";

  const { rooms, loading, refetch } = useChatRooms(!!myAddr);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showList, setShowList] = useState(true);

  const filteredRooms = filterListingId ? rooms.filter((r) => r.listingId === filterListingId) : rooms;

  useEffect(() => {
    if (!filterListingId || loading) return;
    const found = filterPeer
      ? rooms.find((r) => r.listingId === filterListingId && r.peer === filterPeer.toLowerCase())
      : rooms.find((r) => r.listingId === filterListingId);

    if (found) {
      setSelectedRoom(found);
      setShowList(false);
    } else if (filterPeer && !selectedRoom) {
      setSelectedRoom({
        listingId: filterListingId,
        peer: filterPeer.toLowerCase(),
        peerNickname: null,
        lastMessage: { _id: "", listingId: filterListingId, from: "", to: "", content: "", read: true, createdAt: "" },
        unread: 0,
      });
      setShowList(false);
    }
  }, [filterListingId, filterPeer, rooms, loading, selectedRoom]);

  const contracts = (() => {
    try {
      return getContracts(chainId);
    } catch {
      return null;
    }
  })();

  const uniqueIds = [...new Set(filteredRooms.map((r) => r.listingId))];
  const { data: listingData } = useReadContracts({
    contracts: uniqueIds.map((id) => ({
      address: contracts?.marketplace,
      abi: MarketplaceABI as any,
      functionName: "getListing",
      args: [BigInt(id)],
    })),
    query: { enabled: uniqueIds.length > 0 && !!contracts },
  });

  const titleMap: Record<string, string> = {};
  uniqueIds.forEach((id, i) => {
    const listing = listingData?.[i]?.result as any;
    if (listing?.title) titleMap[id] = listing.title;
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto pt-10 text-center">
        <div className="card p-10">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-sm text-gray-500 mb-4">채팅을 이용하려면 로그인이 필요합니다.</p>
          <Link href="/auth/login" className="btn-primary text-sm">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">채팅</h1>

      <div className="card overflow-hidden flex" style={{ height: "calc(100vh - 160px)", minHeight: 480 }}>
        <div className={`flex-shrink-0 border-r border-gray-100 flex flex-col w-full sm:w-72 ${showList ? "flex" : "hidden sm:flex"}`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400">{filteredRooms.length}개의 대화</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center px-4">
                <p className="text-sm text-gray-400">아직 채팅 내역이 없습니다.</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <RoomItem
                  key={`${room.listingId}:${room.peer}`}
                  room={room}
                  selected={selectedRoom?.listingId === room.listingId && selectedRoom?.peer === room.peer}
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowList(false);
                    refetch();
                  }}
                  listingTitle={titleMap[room.listingId]}
                />
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 flex-col min-w-0 ${!showList ? "flex" : "hidden sm:flex"}`}>
          {selectedRoom ? (
            <>
              <button onClick={() => setShowList(true)} className="sm:hidden flex items-center gap-1 px-4 py-2 text-xs text-brand-500 border-b border-gray-100">
                ← 목록으로
              </button>
              <MessageView room={selectedRoom} myAddr={myAddr} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-3 text-gray-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              <p className="text-sm">대화를 선택해 주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
