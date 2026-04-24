import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { NotificationModel } from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/authMiddleware";
import { getBlindCommitDeposit, getListingTradeContext, isServerChainReady } from "@/lib/serverChain";

const ALLOWED_NOTIFICATION_TYPES = new Set(["purchase", "confirm", "open_bid", "blind_bid"]);

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

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isServerChainReady()) {
    return NextResponse.json({ error: "온체인 검증 설정이 없습니다." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.to || !body?.type || !body?.message || !body?.listingId) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  if (!ALLOWED_NOTIFICATION_TYPES.has(body.type)) {
    return NextResponse.json({ error: "지원하지 않는 알림 유형입니다." }, { status: 400 });
  }

  const context = await getListingTradeContext(body.listingId);
  if (!context) {
    return NextResponse.json({ error: "상품 정보를 확인할 수 없습니다." }, { status: 404 });
  }

  const sender = user.walletAddress.toLowerCase();
  const recipient = String(body.to).toLowerCase();
  const seller = context.listing.seller.toLowerCase();

  if (recipient !== seller) {
    return NextResponse.json({ error: "판매자에게만 알림을 보낼 수 있습니다." }, { status: 400 });
  }

  let allowed = false;

  if (body.type === "purchase" || body.type === "confirm") {
    if (context.trade.kind === "direct") {
      allowed =
        context.trade.buyer.toLowerCase() === sender &&
        context.trade.seller.toLowerCase() === recipient &&
        (body.type === "purchase" ? context.trade.state >= 1 : context.trade.state === 2);
    }
  } else if (body.type === "open_bid") {
    if (context.trade.kind === "open") {
      allowed =
        context.trade.highestBidder.toLowerCase() === sender &&
        context.trade.seller.toLowerCase() === recipient &&
        context.trade.state === 0;
    }
  } else if (body.type === "blind_bid") {
    if (context.trade.kind === "blind" && sender !== recipient && context.trade.state === 0) {
      const deposit = await getBlindCommitDeposit(context.listing.tradeContract, sender);
      allowed = deposit > 0n;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "알림 생성 권한이 없습니다." }, { status: 403 });
  }

  await connectDB();
  await NotificationModel.create({
    to: recipient,
    type: body.type,
    listingId: String(body.listingId),
    listingTitle: context.listing.title,
    message: String(body.message).trim().slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}

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
