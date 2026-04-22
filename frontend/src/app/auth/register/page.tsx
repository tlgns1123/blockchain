"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import EmailField from "@/components/common/EmailField";
import NicknameField from "@/components/common/NicknameField";
import PasswordRequirements from "@/components/common/PasswordRequirements";
import { truncateAddress } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();

  const [form, setForm] = useState({ email: "", nickname: "", password: "", confirm: "" });
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAvailable) { setError("이메일 중복 확인을 완료해주세요."); return; }
    if (!nicknameAvailable) { setError("닉네임 중복 확인을 완료해주세요."); return; }
    if (form.password !== form.confirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (!isConnected || !address) { setError("지갑을 먼저 연결해주세요."); return; }

    setLoading(true);
    setError("");
    try {
      // 1. 회원가입
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, nickname: form.nickname, password: form.password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) { setError(regData.error); return; }

      const userId = regData.id;

      // 2. 지갑 서명으로 연동
      const nonce = `블록마켓 인증\nnonce: ${Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("")}\n시간: ${Date.now()}`;
      const signature = await signMessageAsync({ message: nonce });

      const verifyRes = await fetch("/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, signature, walletAddress: address, mode: "link", nonce }),
      });

      if (verifyRes.ok) {
        router.push("/profile");
      } else {
        const verifyData = await verifyRes.json();
        // 계정은 생성됨. 지갑 연동만 실패 → 로그인 후 재시도 안내
        setError((verifyData.error || "지갑 연동 실패") + " — 로그인 후 다시 연동할 수 있어요.");
      }
    } catch (e: any) {
      if (e?.code === 4001 || e?.message?.includes("rejected")) {
        setError("지갑 서명을 취소했습니다. 로그인 후 다시 연동할 수 있어요.");
      } else {
        setError("네트워크 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <div className="card p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-brand-600">블록마켓</Link>
          <h1 className="text-lg font-bold mt-3" style={{ color: "#f0f0f8" }}>회원가입</h1>
          <p className="text-sm text-gray-400 mt-1">블록체인 중고거래 플랫폼에 오신 걸 환영해요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
            <EmailField
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              onAvailableChange={setEmailAvailable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">닉네임</label>
            <NicknameField
              value={form.nickname}
              onChange={(v) => setForm((f) => ({ ...f, nickname: v }))}
              onAvailableChange={setNicknameAvailable}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input
              type="password" required autoComplete="new-password"
              className="input-base" placeholder="비밀번호 입력"
              value={form.password} onChange={set("password")}
            />
            <PasswordRequirements value={form.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호 확인</label>
            <input
              type="password" required autoComplete="new-password"
              className="input-base" placeholder="비밀번호 재입력"
              value={form.confirm} onChange={set("confirm")}
            />
            {form.confirm && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${form.password === form.confirm ? "text-emerald-600" : "text-red-500"}`}>
                <span>{form.password === form.confirm ? "✓" : "✕"}</span>
                {form.password === form.confirm ? "비밀번호가 일치해요." : "비밀번호가 일치하지 않아요."}
              </p>
            )}
          </div>

          {/* 지갑 연결 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              지갑 연결 <span className="text-red-400">*</span>
            </label>
            {isConnected && address ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="font-medium">{truncateAddress(address)}</span>
                <span className="text-xs ml-auto" style={{ color: "#565670" }}>연결됨</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={openConnectModal}
                className="w-full btn-secondary text-sm py-3"
              >
                MetaMask 연결하기
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1.5">지갑은 1계정에 1개만 연결됩니다. 연결 후 변경할 수 없어요.</p>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isConnected}
            className="btn-primary w-full mt-2"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-brand-500 hover:underline font-medium">로그인</Link>
        </p>
      </div>
    </div>
  );
}
