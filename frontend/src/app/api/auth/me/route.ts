import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json(null);
  return NextResponse.json({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    walletAddress: user.walletAddress,
  });
}
