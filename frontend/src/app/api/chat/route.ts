import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";
import { connectDB } from "@/lib/mongoose";
import { MessageModel } from "@/lib/models/Message";

// GET /api/chat?listingId=X&peer=Y  — 두 사람 간 메시지 조회
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  const peer      = searchParams.get("peer")?.toLowerCase();
  if (!listingId || !peer)
    return NextResponse.json({ error: "listingId, peer 필요" }, { status: 400 });

  await connectDB();
  const myAddr = user.walletAddress.toLowerCase();

  const messages = await MessageModel.find({
    listingId,
    $or: [
      { from: myAddr, to: peer },
      { from: peer,   to: myAddr },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json(messages);
}

// POST /api/chat  — 메시지 전송
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { listingId, to, content } = await req.json();
  if (!listingId || !to || !content?.trim())
    return NextResponse.json({ error: "필드 누락" }, { status: 400 });

  const myAddr = user.walletAddress.toLowerCase();
  if (myAddr === to.toLowerCase())
    return NextResponse.json({ error: "자신에게 메시지 불가" }, { status: 400 });

  await connectDB();
  const msg = await MessageModel.create({
    listingId,
    from:    myAddr,
    to:      to.toLowerCase(),
    content: content.trim(),
  });

  return NextResponse.json(msg, { status: 201 });
}
