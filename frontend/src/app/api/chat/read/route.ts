import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";
import { connectDB } from "@/lib/mongoose";
import { MessageModel } from "@/lib/models/Message";

// PUT /api/chat/read  — 특정 방의 메시지를 읽음 처리
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { listingId, peer } = await req.json();
  if (!listingId || !peer)
    return NextResponse.json({ error: "listingId, peer 필요" }, { status: 400 });

  await connectDB();
  const myAddr = user.walletAddress.toLowerCase();

  await MessageModel.updateMany(
    { listingId, from: peer.toLowerCase(), to: myAddr, read: false },
    { $set: { read: true } }
  );

  return NextResponse.json({ ok: true });
}
