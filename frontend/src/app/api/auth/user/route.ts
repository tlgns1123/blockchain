import { NextRequest, NextResponse } from "next/server";
import { findByWallet } from "@/lib/userStore";

// GET /api/auth/user?wallet=0x...  — 지갑 주소로 닉네임 조회 (공개)
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ nickname: null });
  const user = await findByWallet(wallet);
  return NextResponse.json({ nickname: user?.nickname ?? null });
}
