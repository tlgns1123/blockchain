"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, useSendMessage, useMarkRead } from "@/hooks/useChat";
import { truncateAddress } from "@/lib/utils";
import Link from "next/link";

interface Props {
  listingId: string;
  sellerAddress: string;
  sellerNickname?: string | null;
  /** 판매자 본인이면 true → 문의 링크로 대체 */
  isSeller: boolean;
  inquiryCount?: number;
}

export default function ChatPanel({ listingId, sellerAddress, sellerNickname, isSeller, inquiryCount = 0 }: Props) {
  const { address } = useAccount();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myAddr   = user?.walletAddress ?? address ?? "";
  const peerAddr = isSeller ? "" : sellerAddress;

  const { messages, refetch } = useChatMessages(listingId, peerAddr, open && !isSeller);
  const { send, sending } = useSendMessage();
  const markRead = useMarkRead();

  // 패널 열릴 때 읽음 처리 (1.5초 후 — 배지가 먼저 보이게)
  useEffect(() => {
    if (!open || !peerAddr) return;
    const t = setTimeout(() => markRead(listingId, peerAddr), 1500);
    return () => clearTimeout(t);
  }, [open, listingId, peerAddr]);

  // 새 메시지 시 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const MAX_LEN = 300;

  const handleSend = async () => {
    if (!input.trim() || !peerAddr) return;
    if (input.trim().length > MAX_LEN) {
      setSendError(`메시지는 ${MAX_LEN}자 이하로 입력해주세요.`);
      return;
    }
    setSendError("");
    const ok = await send(listingId, peerAddr, input.trim());
    if (ok) { setInput(""); refetch(); }
    else setSendError("전송에 실패했어요. 잠시 후 다시 시도해주세요.");
  };

  // 판매자: 문의 목록 링크
  if (isSeller) {
    if (inquiryCount === 0) return null;
    return (
      <Link
        href={`/chat?listingId=${listingId}`}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
        채팅 문의 {inquiryCount}건 보기 →
      </Link>
    );
  }

  // 비로그인
  if (!user || !myAddr) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
        <Link href="/auth/login" className="text-brand-500 hover:underline">로그인</Link> 후 채팅 가능해요.
      </div>
    );
  }

  // 자기 자신
  if (myAddr.toLowerCase() === sellerAddress.toLowerCase()) return null;

  return (
    <div className="card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-brand-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          <span className="text-sm font-medium text-gray-900">판매자에게 채팅하기</span>
          <span className="text-xs text-gray-400">{sellerNickname ?? truncateAddress(sellerAddress)}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* 메시지 목록 */}
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50 border-t border-gray-100">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-8">첫 메시지를 보내보세요.</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.from === myAddr.toLowerCase();
              return (
                <div key={msg._id} className={`flex items-end gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                  {isMine && !msg.read && (
                    <span className="text-[10px] text-brand-400 font-bold mb-1">1</span>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${isMine
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                    }`}>
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

          {/* 입력창 */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-1.5">
            {sendError && (
              <p className="text-xs text-red-500">{sendError}</p>
            )}
            <div className="flex gap-2">
              <input
                className="input-base flex-1 text-sm py-2"
                placeholder="메시지 입력..."
                value={input}
                maxLength={MAX_LEN}
                onChange={(e) => { setInput(e.target.value); if (sendError) setSendError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
              >
                전송
              </button>
            </div>
            {input.length > MAX_LEN * 0.8 && (
              <p className="text-[10px] text-gray-400 text-right">{input.length}/{MAX_LEN}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
