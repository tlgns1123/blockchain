"use client";
import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  _id: string;
  to: string;
  type: "purchase" | "confirm" | "open_bid" | "blind_bid";
  listingId: string;
  listingTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifications(await res.json());
  }, [enabled]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 15000);
    return () => clearInterval(id);
  }, [fetch_]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PUT" });
  }, []);

  return { notifications, unreadCount, markAllRead, refetch: fetch_ };
}
