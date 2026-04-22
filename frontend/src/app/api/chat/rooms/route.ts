import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";
import { connectDB } from "@/lib/mongoose";
import { MessageModel } from "@/lib/models/Message";
import { UserModel } from "@/lib/models/User";

// GET /api/chat/rooms  — 내 채팅방 목록 (마지막 메시지 + 읽지 않은 수)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  await connectDB();
  const myAddr = user.walletAddress.toLowerCase();

  const messages = await MessageModel.find({
    $or: [{ from: myAddr }, { to: myAddr }],
  })
    .sort({ createdAt: -1 })
    .lean();

  // 채팅방 그룹핑: key = listingId:peer
  const roomMap = new Map<
    string,
    { listingId: string; peer: string; lastMessage: any; unread: number }
  >();

  for (const msg of messages) {
    const peer = msg.from === myAddr ? msg.to : msg.from;
    const key  = `${msg.listingId}:${peer}`;
    if (!roomMap.has(key)) {
      roomMap.set(key, { listingId: msg.listingId, peer, lastMessage: msg, unread: 0 });
    }
    if (msg.to === myAddr && !msg.read) {
      roomMap.get(key)!.unread++;
    }
  }

  const rooms = Array.from(roomMap.values());

  // 상대방 닉네임 조회 (주소는 이미 lowercase로 저장됨)
  const peerAddrs = rooms.map((r) => r.peer);
  const peerUsers = await UserModel.find({
    walletAddress: { $in: peerAddrs },
  }).lean();
  const nickMap: Record<string, string> = {};
  for (const u of peerUsers) {
    if (u.walletAddress) nickMap[u.walletAddress.toLowerCase()] = u.nickname;
  }

  const result = rooms.map((r) => ({
    ...r,
    peerNickname: nickMap[r.peer] ?? null,
  }));

  return NextResponse.json(result);
}
