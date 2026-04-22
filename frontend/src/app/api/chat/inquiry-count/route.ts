import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";
import { connectDB } from "@/lib/mongoose";
import { MessageModel } from "@/lib/models/Message";

// GET /api/chat/inquiry-count?listingId=X  — 해당 listing의 문의자 수 (판매자용)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const listingId = new URL(req.url).searchParams.get("listingId");
  if (!listingId)
    return NextResponse.json({ error: "listingId 필요" }, { status: 400 });

  await connectDB();
  const myAddr = user.walletAddress.toLowerCase();

  // 해당 listing에서 나(판매자)에게 보낸 고유 발신자 수
  const senders = await MessageModel.distinct("from", {
    listingId,
    to: myAddr,
  });

  return NextResponse.json({ count: senders.length });
}
