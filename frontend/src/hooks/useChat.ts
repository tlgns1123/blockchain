"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export interface ChatMessage {
  _id: string;
  listingId: string;
  from: string;
  to: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface ChatRoom {
  listingId: string;
  peer: string;
  peerNickname: string | null;
  lastMessage: ChatMessage;
  unread: number;
}

// ─── 방 메시지 ────────────────────────────────────────────────────────────────
export function useChatMessages(listingId: string, peer: string, enabled = true) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!enabled || !listingId || !peer) return;
    const res = await fetch(`/api/chat?listingId=${listingId}&peer=${peer}`);
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }, [listingId, peer, enabled]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { messages, loading, refetch: fetch_ };
}

// ─── 메시지 전송 ──────────────────────────────────────────────────────────────
export function useSendMessage() {
  const [sending, setSending] = useState(false);

  const send = useCallback(async (listingId: string, to: string, content: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, to, content }),
      });
      return res.ok;
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending };
}

// ─── 읽음 처리 ────────────────────────────────────────────────────────────────
export function useMarkRead() {
  return useCallback(async (listingId: string, peer: string) => {
    await fetch("/api/chat/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, peer }),
    });
  }, []);
}

// ─── 채팅방 목록 ──────────────────────────────────────────────────────────────
export function useChatRooms(enabled = true) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch("/api/chat/rooms");
    if (res.ok) setRooms(await res.json());
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 10000);
    return () => clearInterval(id);
  }, [fetch_]);

  const unreadTotal = rooms.reduce((s, r) => s + r.unread, 0);
  return { rooms, loading, unreadTotal, refetch: fetch_ };
}

// ─── 판매자용 특정 listing 문의자 수 ─────────────────────────────────────────
export function useInquiryCount(listingId: string, enabled = true) {
  const [count, setCount] = useState(0);

  const fetch_ = useCallback(async () => {
    if (!enabled || !listingId) return;
    const res = await fetch(`/api/chat/inquiry-count?listingId=${listingId}`);
    if (res.ok) {
      const data = await res.json();
      setCount(data.count ?? 0);
    }
  }, [listingId, enabled]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 15000);
    return () => clearInterval(id);
  }, [fetch_]);

  return count;
}
