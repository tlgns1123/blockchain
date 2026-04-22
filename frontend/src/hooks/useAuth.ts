"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  walletAddress: string | null;
}

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  return res.json();
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  return { user: user ?? null, isLoading };
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.setQueryData(["me"], null);
    window.location.href = "/";
  };
}
