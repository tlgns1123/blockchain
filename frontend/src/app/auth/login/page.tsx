"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";

type Step = "credentials" | "wallet";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingNonce, setPendingNonce] = useState("");
  const [pendingWallet, setPendingWallet] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const autoSignRef = useRef(false);
  const verifyInFlightRef = useRef(false);

  const registered = params.get("registered");

  useEffect(() => {
    if (isConnected && autoSignRef.current) {
      autoSignRef.current = false;
      void handleWalletVerify();
    }
  }, [isConnected]);

  useEffect(() => {
    if (step !== "wallet" || !address || !pendingWallet || isLinking) return;

    if (address.toLowerCase() === pendingWallet.toLowerCase()) {
      setError("");
      void handleWalletVerify();
    }
  }, [address, step, pendingWallet, isLinking]);

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setPendingUserId(data.userId);
      setPendingNonce(data.nonce);
      setPendingWallet(data.walletAddress ?? "");
      setIsLinking(data.step === "link_wallet");
      setStep("wallet");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletVerify = async () => {
    if (verifyInFlightRef.current) return;

    if (!isConnected || !address) {
      setError("MetaMask를 먼저 연결해 주세요.");
      return;
    }

    if (!pendingNonce || !pendingUserId) {
      setError("인증 정보가 만료되었습니다. 다시 로그인해 주세요.");
      return;
    }

    if (!isLinking && address.toLowerCase() !== pendingWallet.toLowerCase()) {
      setError(`등록된 지갑(${pendingWallet.slice(0, 6)}...${pendingWallet.slice(-4)})으로 연결해 주세요.`);
      return;
    }

    setLoading(true);
    setError("");
    verifyInFlightRef.current = true;

    try {
      const signature = await signMessageAsync({ message: pendingNonce });
      const res = await fetch("/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingUserId,
          signature,
          walletAddress: address,
          mode: isLinking ? "link" : "login",
          nonce: pendingNonce,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        setError("서명을 취소했습니다.");
      } else {
        setError("지갑 인증 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
      verifyInFlightRef.current = false;
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <div className="card p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-brand-400">
            블록마켓
          </Link>
          <h1 className="text-lg font-bold mt-3" style={{ color: "#f0f0f8" }}>
            로그인
          </h1>
        </div>

        {registered && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-4"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}
          >
            계정이 생성되었습니다. 지갑 인증을 완료해 주세요.
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-base"
                placeholder="example@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input-base"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "확인 중..." : "다음"}
            </button>
          </form>
        )}

        {step === "wallet" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700 leading-relaxed">
              {isLinking ? (
                <>
                  <strong>지갑 연결</strong>
                  <br />
                  이 계정에 연결할 MetaMask 지갑으로 서명해 주세요.
                </>
              ) : (
                <>
                  <strong>MetaMask 2차 인증</strong>
                  <br />
                  등록된 지갑({pendingWallet.slice(0, 6)}...{pendingWallet.slice(-4)})으로 서명해 주세요.
                </>
              )}
            </div>

            {isConnected && !isLinking && address?.toLowerCase() !== pendingWallet.toLowerCase() && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                다른 지갑이 연결되어 있습니다.
                <br />
                현재: {address?.slice(0, 6)}...{address?.slice(-4)}
                <br />
                필요: {pendingWallet.slice(0, 6)}...{pendingWallet.slice(-4)}
              </div>
            )}

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                {error}
              </div>
            )}

            <button
              className="btn-primary w-full"
              disabled={loading}
              onClick={() => {
                if (!isConnected) {
                  autoSignRef.current = true;
                  openConnectModal?.();
                } else {
                  void handleWalletVerify();
                }
              }}
            >
              {loading ? "서명 중..." : "MetaMask로 인증하기"}
            </button>

            <button
              className="btn-secondary w-full text-sm"
              onClick={() => {
                setStep("credentials");
                setError("");
              }}
            >
              이전으로
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          계정이 없으신가요?{" "}
          <Link href="/auth/register" className="text-brand-500 hover:underline font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
