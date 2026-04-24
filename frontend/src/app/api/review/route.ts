import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ReviewModel } from "@/lib/models/Review";
import { getAuthUser } from "@/lib/authMiddleware";
import { getListingTradeContext, isServerChainReady } from "@/lib/serverChain";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  await connectDB();
  const reviews = await ReviewModel.find({ reviewee: address })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;

  return NextResponse.json({ reviews, avg, total: reviews.length });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!user.walletAddress) {
    return NextResponse.json({ error: "지갑이 연결된 계정만 리뷰를 작성할 수 있습니다." }, { status: 400 });
  }

  if (!isServerChainReady()) {
    return NextResponse.json({ error: "온체인 검증 설정이 없습니다." }, { status: 503 });
  }

  const { listingId, reviewee, rating, comment, role } = await req.json();

  if (!listingId || !reviewee || !rating || !role) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "평점은 1점부터 5점 사이여야 합니다." }, { status: 400 });
  }

  if (user.walletAddress.toLowerCase() === String(reviewee).toLowerCase()) {
    return NextResponse.json({ error: "자기 자신에게 리뷰를 남길 수 없습니다." }, { status: 400 });
  }

  const context = await getListingTradeContext(String(listingId));
  if (!context) {
    return NextResponse.json({ error: "상품 정보를 확인할 수 없습니다." }, { status: 404 });
  }

  const reviewer = user.walletAddress.toLowerCase();
  const normalizedReviewee = String(reviewee).toLowerCase();
  const normalizedRole = String(role) as "buyer" | "seller";

  let expectedReviewee = "";
  let expectedRole: "buyer" | "seller" | null = null;

  if (context.trade.kind === "direct") {
    if (context.trade.state !== 2) {
      return NextResponse.json({ error: "거래 완료 후에만 리뷰를 작성할 수 있습니다." }, { status: 400 });
    }

    const seller = context.trade.seller.toLowerCase();
    const buyer = context.trade.buyer.toLowerCase();

    if (!buyer || buyer === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "구매자 정보가 확인되지 않습니다." }, { status: 400 });
    }

    if (reviewer === buyer) {
      expectedReviewee = seller;
      expectedRole = "buyer";
    } else if (reviewer === seller) {
      expectedReviewee = buyer;
      expectedRole = "seller";
    }
  } else {
    if (context.trade.state !== 2) {
      return NextResponse.json({ error: "거래 완료 후에만 리뷰를 작성할 수 있습니다." }, { status: 400 });
    }

    const seller = context.trade.seller.toLowerCase();
    const winner = context.trade.winner.toLowerCase();

    if (!winner || winner === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "낙찰자 정보가 확인되지 않습니다." }, { status: 400 });
    }

    if (reviewer === winner) {
      expectedReviewee = seller;
      expectedRole = "buyer";
    } else if (reviewer === seller) {
      expectedReviewee = winner;
      expectedRole = "seller";
    }
  }

  if (!expectedRole || normalizedReviewee !== expectedReviewee || normalizedRole !== expectedRole) {
    return NextResponse.json({ error: "거래 당사자만 올바른 대상에게 리뷰를 작성할 수 있습니다." }, { status: 403 });
  }

  await connectDB();

  try {
    const review = await ReviewModel.create({
      listingId: String(listingId),
      reviewer,
      reviewee: normalizedReviewee,
      rating,
      comment: String(comment ?? "").slice(0, 200),
      role: normalizedRole,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "이미 리뷰를 작성했습니다." }, { status: 409 });
    }

    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
