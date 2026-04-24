import { NextRequest, NextResponse } from "next/server";
import { isAddress, recoverMessageAddress } from "viem";
import { findById, findByWallet, updateUser } from "@/lib/userStore";
import { consumeNonce, signToken } from "@/lib/jwt";
import { setCookieHeader } from "@/lib/authMiddleware";

export async function POST(req: NextRequest) {
  const { userId, signature, walletAddress, mode, nonce } = await req.json();

  if (!userId || !signature || !walletAddress || !nonce) {
    return NextResponse.json({ error: "지갑 인증 정보가 올바르지 않습니다." }, { status: 400 });
  }

  if (mode !== "link" && mode !== "login") {
    return NextResponse.json({ error: "잘못된 인증 요청입니다." }, { status: 400 });
  }

  if (!isAddress(walletAddress)) {
    return NextResponse.json({ error: "유효하지 않은 지갑 주소입니다." }, { status: 400 });
  }

  const user = await findById(userId);
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!consumeNonce(userId, nonce)) {
    return NextResponse.json({ error: "인증 시간이 만료되었거나 잘못된 요청입니다. 다시 로그인해 주세요." }, { status: 400 });
  }

  let recoveredAddr: string;
  try {
    recoveredAddr = await recoverMessageAddress({
      message: nonce,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "서명 검증에 실패했습니다." }, { status: 400 });
  }

  if (recoveredAddr.toLowerCase() !== walletAddress.toLowerCase()) {
    return NextResponse.json({ error: "서명한 지갑 주소가 요청한 주소와 일치하지 않습니다." }, { status: 400 });
  }

  const normalizedAddr = walletAddress.toLowerCase();

  if (mode === "link") {
    const existing = await findByWallet(normalizedAddr);
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "이미 다른 계정에 연결된 지갑 주소입니다." }, { status: 409 });
    }
    await updateUser(userId, { walletAddress: normalizedAddr });
  } else if (user.walletAddress?.toLowerCase() !== normalizedAddr) {
    return NextResponse.json({ error: "등록된 지갑 주소와 일치하지 않습니다." }, { status: 400 });
  }

  const token = signToken({ userId });
  const updatedUser = (await findById(userId))!;

  const res = NextResponse.json({
    id: updatedUser.id,
    email: updatedUser.email,
    nickname: updatedUser.nickname,
    walletAddress: updatedUser.walletAddress,
  });
  res.headers.set("Set-Cookie", setCookieHeader(token));
  return res;
}
