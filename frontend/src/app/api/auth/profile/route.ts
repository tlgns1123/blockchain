import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/authMiddleware";
import { updateUser } from "@/lib/userStore";
import { validateNickname, validatePassword } from "@/lib/validation";

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { nickname, currentPassword, newPassword } = await req.json();
  const patch: Record<string, string> = {};

  if (nickname !== undefined) {
    const err = validateNickname(nickname);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    patch.nickname = nickname;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력해 주세요." }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
    }

    const err = validatePassword(newPassword);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    patch.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  try {
    const updated = await updateUser(user.id, patch);
    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      walletAddress: updated.walletAddress,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    return NextResponse.json({ error: "프로필 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
