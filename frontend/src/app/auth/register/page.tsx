"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import EmailField from "@/components/common/EmailField";
import NicknameField from "@/components/common/NicknameField";
import PasswordRequirements from "@/components/common/PasswordRequirements";
import { truncateAddress } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== sepolia.id;

  const handleChangeWallet = () => {
    disconnect();
    setTimeout(() => openConnectModal?.(), 100);
  };

  const [form, setForm] = useState({ email: "", nickname: "", password: "", confirm: "" });
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletChecking, setWalletChecking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setWalletError("");
      return;
    }
    let cancelled = false;
    setWalletChecking(true);
    setWalletError("");
    fetch(`/api/auth/check-wallet?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && !data.available) setWalletError(data.message);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setWalletChecking(false); });
    return () => { cancelled = true; };
  }, [address]);

  const setField =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!emailAvailable) {
      setError("이메일 중복 확인을 완료해 주세요.");
      return;
    }

    if (!nicknameAvailable) {
      setError("닉네임 중복 확인을 완료해 주세요.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!isConnected || !address) {
      setError("지갑을 먼저 연결해 주세요.");
      return;
    }

    if (walletError) {
      setError(walletError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          nickname: form.nickname,
          password: form.password,
          walletAddress: address,
        }),
      });

      const registerData = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok) {
        setError(registerData.error || "회원가입 처리 중 오류가 발생했습니다.");
        return;
      }

      const signature = await signMessageAsync({ message: registerData.nonce });

      const verifyRes = await fetch("/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: registerData.id,
          signature,
          walletAddress: address,
          mode: "link",
          nonce: registerData.nonce,
        }),
      });

      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}));
        setError(verifyData.error || "지갑 연결에 실패했습니다.");
        return;
      }

      router.push("/profile");
    } catch (error: any) {
      const isRejected =
        error?.code === 4001 ||
        error?.name === "UserRejectedRequestError" ||
        error?.message?.toLowerCase().includes("rejected") ||
        error?.message?.toLowerCase().includes("denied");
      if (isRejected) {
        setError("지갑 서명이 취소되었습니다.");
      } else {
        setError(error?.shortMessage || error?.message || "서버 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <div className="card p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-brand-600">
            블록마켓
          </Link>
          <h1 className="text-lg font-bold mt-3" style={{ color: "#f0f0f8" }}>
            회원가입
          </h1>
          <p className="text-sm text-gray-400 mt-1">지갑 연결까지 완료하면 바로 거래를 시작할 수 있습니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
            <EmailField
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              onAvailableChange={setEmailAvailable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">닉네임</label>
            <NicknameField
              value={form.nickname}
              onChange={(value) => setForm((prev) => ({ ...prev, nickname: value }))}
              onAvailableChange={setNicknameAvailable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-base"
              placeholder="비밀번호 입력"
              value={form.password}
              onChange={setField("password")}
            />
            <PasswordRequirements value={form.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-base"
              placeholder="비밀번호 재입력"
              value={form.confirm}
              onChange={setField("confirm")}
            />
            {form.confirm && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${form.password === form.confirm ? "text-emerald-600" : "text-red-500"}`}>
                <span>{form.password === form.confirm ? "✓" : "✕"}</span>
                {form.password === form.confirm ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              지갑 연결 <span className="text-red-400">*</span>
            </label>
            {isConnected && address ? (
              <>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: walletError || isWrongChain ? "rgba(239,68,68,0.08)" : "rgba(52,211,153,0.08)",
                    border: `1px solid ${walletError || isWrongChain ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
                    color: walletError || isWrongChain ? "#fca5a5" : "#34d399",
                  }}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${walletError || isWrongChain ? "bg-red-400" : "bg-emerald-400"}`} />
                  <span className="font-medium">{truncateAddress(address)}</span>
                  <button
                    type="button"
                    onClick={handleChangeWallet}
                    className="text-xs ml-auto hover:underline"
                    style={{ color: "#8b8ba8" }}
                  >
                    {walletChecking ? "확인 중..." : "지갑 변경"}
                  </button>
                </div>
                {isWrongChain && (
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-red-400">Sepolia 네트워크로 전환이 필요합니다.</p>
                    <button
                      type="button"
                      onClick={() => switchChain({ chainId: sepolia.id })}
                      disabled={isSwitching}
                      className="text-xs text-brand-400 hover:underline ml-2"
                    >
                      {isSwitching ? "전환 중..." : "전환하기"}
                    </button>
                  </div>
                )}
                {!isWrongChain && walletError && <p className="text-xs text-red-400 mt-1.5">{walletError}</p>}
                {!isWrongChain && !walletError && <p className="text-xs text-gray-400 mt-1.5">지갑은 계정당 1개만 연결할 수 있습니다.</p>}
              </>
            ) : (
              <button type="button" onClick={openConnectModal} className="w-full btn-secondary text-sm py-3">
                MetaMask 연결하기
              </button>
            )}
            {!isConnected && <p className="text-xs text-gray-400 mt-1.5">지갑은 계정당 1개만 연결할 수 있습니다.</p>}
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !isConnected || !!walletError || walletChecking || isWrongChain} className="btn-primary w-full mt-2">
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-brand-500 hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
