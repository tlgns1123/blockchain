"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";

type Step = "credentials" | "wallet";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
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
  const [isLinking, setIsLinking] = useState(false); // 최초 지갑 연결 모드
  const autoSignRef = useRef(false);

  const registered = params.get("registered");

  // 지갑 연결 완료 시 자동 서명
  useEffect(() => {
    if (isConnected && autoSignRef.current) {
      autoSignRef.current = false;
      handleWalletVerify();
    }
  }, [isConnected]);

  // 계정 변경 시: 에러 초기화 + 맞는 지갑으로 바뀌면 자동 서명
  useEffect(() => {
    if (step !== "wallet" || !address || !pendingWallet) return;
    if (address.toLowerCase() === pendingWallet.toLowerCase()) {
      setError("");
      handleWalletVerify();
    }
  }, [address]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      if (data.step === "link_wallet") {
        setPendingUserId(data.userId);
        setPendingNonce(data.nonce);
        setIsLinking(true);
        setStep("wallet");
      } else if (data.step === "verify_wallet") {
        setPendingUserId(data.userId);
        setPendingNonce(data.nonce);
        setPendingWallet(data.walletAddress);
        setIsLinking(false);
        setStep("wallet");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletVerify = async () => {
    if (!isConnected || !address) {
      setError("MetaMask를 먼저 연결해주세요.");
      return;
    }
    if (!isLinking && address.toLowerCase() !== pendingWallet.toLowerCase()) {
      setError(`등록된 지갑 주소(${pendingWallet.slice(0, 6)}...${pendingWallet.slice(-4)})로 연결해주세요.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      // nonce가 없으면 재발급
      let nonce = pendingNonce;
      if (!nonce) {
        nonce = `블록마켓 로그인 인증\n시간: ${Date.now()}`;
      }
      const signature = await signMessageAsync({ message: nonce });
      const res = await fetch("/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingUserId,
          signature,
          walletAddress: address,
          mode: isLinking ? "link" : "login",
          nonce,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
    } catch (e: any) {
      if (e.code === 4001 || e.message?.includes("rejected")) {
        setError("서명을 거부했습니다.");
      } else {
        setError("서명 오류: " + (e.shortMessage ?? e.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <div className="card p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-brand-400">블록마켓</Link>
          <h1 className="text-lg font-bold mt-3" style={{ color: "#f0f0f8" }}>로그인</h1>
        </div>

        {registered && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
            계정이 생성됐어요. 로그인 후 지갑을 연동해주세요.
          </div>
        )}

        {/* Step 1: 이메일 + 비번 */}
        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input
                type="email" required autoComplete="email"
                className="input-base" placeholder="example@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password" required autoComplete="current-password"
                className="input-base" placeholder="비밀번호 입력"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "확인 중..." : "다음"}
            </button>
          </form>
        )}

        {/* Step 2: MetaMask 서명 */}
        {step === "wallet" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700 leading-relaxed">
              {isLinking ? (
                <>
                  <strong>지갑 연결</strong><br />
                  이 계정에 연결할 MetaMask 지갑으로 서명해주세요.<br />
                  <span className="text-xs text-brand-500">연결된 지갑은 이후 변경할 수 없습니다.</span>
                </>
              ) : (
                <>
                  <strong>MetaMask 2차 인증</strong><br />
                  등록된 지갑({pendingWallet.slice(0, 6)}...{pendingWallet.slice(-4)})으로<br />
                  서명하여 본인 확인을 완료해주세요.
                </>
              )}
            </div>

            {isConnected && !isLinking && address?.toLowerCase() !== pendingWallet.toLowerCase() && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                잘못된 지갑이 연결됐어요.<br />
                현재: {address?.slice(0, 6)}...{address?.slice(-4)}<br />
                필요: {pendingWallet.slice(0, 6)}...{pendingWallet.slice(-4)}
              </div>
            )}

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
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
                  handleWalletVerify();
                }
              }}
            >
              {loading ? "서명 중..." : "MetaMask로 인증하기"}
            </button>

            <button
              className="btn-secondary w-full text-sm"
              onClick={() => { setStep("credentials"); setError(""); }}
            >
              ← 이전으로
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
    <Suspense fallback={<div className="max-w-md mx-auto pt-10"><div className="card p-8 text-center text-sm text-gray-400">로딩 중...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
