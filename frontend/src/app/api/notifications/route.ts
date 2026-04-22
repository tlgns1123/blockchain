import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { NotificationModel } from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/authMiddleware";

// GET: 현재 사용자의 알림 목록 (최근 30개)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) return NextResponse.json([], { status: 200 });

  await connectDB();
  const list = await NotificationModel.find({ to: user.walletAddress.toLowerCase() })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return NextResponse.json(list);
}

// POST: 알림 생성 (거래 패널에서 호출 — 인증 불필요)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.type || !body?.message) {
    return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
  }

  await connectDB();
  await NotificationModel.create({
    to: body.to.toLowerCase(),
    type: body.type,
    listingId: body.listingId ?? "",
    listingTitle: body.listingTitle ?? "",
    message: body.message,
  });

  return NextResponse.json({ ok: true });
}

// PUT: 현재 사용자의 모든 알림 읽음 처리
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) return NextResponse.json({ ok: false }, { status: 401 });

  await connectDB();
  await NotificationModel.updateMany(
    { to: user.walletAddress.toLowerCase(), read: false },
    { $set: { read: true } }
  );

  return NextResponse.json({ ok: true });
}
