import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findByEmail, createUser } from "@/lib/userStore";
import { createNonce } from "@/lib/jwt";
import { validateEmail, validatePassword, validateNickname } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { email, nickname, password } = await req.json();

  const emailErr = validateEmail(email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  const nicknameErr = validateNickname(nickname);
  if (nicknameErr) return NextResponse.json({ error: nicknameErr }, { status: 400 });

  const passwordErr = validatePassword(password);
  if (passwordErr) return NextResponse.json({ error: passwordErr }, { status: 400 });

  if (await findByEmail(email)) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await createUser({ email, nickname, passwordHash });
    const nonce = createNonce(user.id);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        walletAddress: user.walletAddress,
        nonce,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern ?? {})[0];

      if (duplicateField === "email") {
        return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
      }

      if (duplicateField === "nickname") {
        return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "회원가입 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
