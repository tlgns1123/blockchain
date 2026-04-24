import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findByEmail } from "@/lib/userStore";
import { createNonce } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const user = await findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const nonce = createNonce(user.id);

  if (!user.walletAddress) {
    return NextResponse.json({
      step: "link_wallet",
      userId: user.id,
      nickname: user.nickname,
      nonce,
    });
  }

  return NextResponse.json({
    step: "verify_wallet",
    userId: user.id,
    nonce,
    walletAddress: user.walletAddress,
  });
}
