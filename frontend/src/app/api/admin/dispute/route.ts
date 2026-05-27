import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { DisputeLogModel } from "@/lib/models/DisputeLog";
import { NotificationModel } from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/authMiddleware";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? "").toLowerCase();

async function isAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) return false;
  return user.walletAddress.toLowerCase() === PLATFORM;
}

// GET /api/admin/dispute  → 처리 완료 로그 목록
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const logs = await DisputeLogModel.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(logs);
}

// POST /api/admin/dispute  → 분쟁 처리 기록 + 양측 알림
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);

  if (
    !body?.contractAddress ||
    !body?.listingId ||
    !body?.seller ||
    !body?.buyer ||
    !body?.price ||
    !body?.resolution ||
    !body?.reason?.trim()
  ) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  await connectDB();

  await DisputeLogModel.create({
    contractAddress: body.contractAddress.toLowerCase(),
    listingId:       String(body.listingId),
    listingTitle:    body.listingTitle ?? "",
    seller:          body.seller.toLowerCase(),
    buyer:           body.buyer.toLowerCase(),
    price:           String(body.price),
    resolution:      body.resolution,
    reason:          String(body.reason).trim().slice(0, 500),
    resolvedBy:      user!.walletAddress!.toLowerCase(),
  });

  const isRefund = body.resolution === "refund_buyer";
  const titlePart = body.listingTitle ? ` · ${body.listingTitle}` : "";

  // 구매자 알림
  await NotificationModel.create({
    to:           body.buyer.toLowerCase(),
    type:         "admin_resolve",
    listingId:    String(body.listingId),
    listingTitle: body.listingTitle ?? "",
    message:      isRefund
      ? `[관리자 중재] BKT가 환불되었습니다${titlePart}. 사유: ${body.reason}`
      : `[관리자 중재] 판매자에게 정산되었습니다${titlePart}. 사유: ${body.reason}`,
    read: false,
  });

  // 판매자 알림
  await NotificationModel.create({
    to:           body.seller.toLowerCase(),
    type:         "admin_resolve",
    listingId:    String(body.listingId),
    listingTitle: body.listingTitle ?? "",
    message:      isRefund
      ? `[관리자 중재] 구매자에게 환불 처리되었습니다${titlePart}. 사유: ${body.reason}`
      : `[관리자 중재] BKT가 정산되었습니다${titlePart}. 사유: ${body.reason}`,
    read: false,
  });

  return NextResponse.json({ ok: true });
}
