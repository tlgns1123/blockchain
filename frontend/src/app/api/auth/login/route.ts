import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { findByEmail } from "@/lib/userStore";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const nonce = `블록마켓 인증\nnonce: ${randomBytes(16).toString("hex")}\n시간: ${Date.now()}`;

  if (!user.walletAddress) {
    return NextResponse.json({ step: "link_wallet", userId: user.id, nickname: user.nickname, nonce });
  }

  return NextResponse.json({ step: "verify_wallet", userId: user.id, nonce, walletAddress: user.walletAddress });
}
