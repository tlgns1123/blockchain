import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ReviewModel } from "@/lib/models/Review";
import { getAuthUser } from "@/lib/authMiddleware";

// GET /api/review?address=0x...   → 해당 주소에 대한 리뷰 목록
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
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  return NextResponse.json({ reviews, avg, total: reviews.length });
}

// POST /api/review   → 리뷰 생성 (로그인 필요)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!user.walletAddress)
    return NextResponse.json({ error: "지갑 주소가 연결된 계정만 리뷰를 작성할 수 있습니다." }, { status: 400 });

  const { listingId, reviewee, rating, comment, role } = await req.json();

  if (!listingId || !reviewee || !rating || !role)
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  if (rating < 1 || rating > 5)
    return NextResponse.json({ error: "별점은 1–5 사이여야 합니다." }, { status: 400 });
  if (user.walletAddress.toLowerCase() === reviewee.toLowerCase())
    return NextResponse.json({ error: "자신에게 리뷰를 남길 수 없습니다." }, { status: 400 });

  await connectDB();

  try {
    const review = await ReviewModel.create({
      listingId,
      reviewer: user.walletAddress.toLowerCase(),
      reviewee: reviewee.toLowerCase(),
      rating,
      comment: (comment ?? "").slice(0, 200),
      role,
    });
    return NextResponse.json(review, { status: 201 });
  } catch (e: any) {
    if (e.code === 11000)
      return NextResponse.json({ error: "이미 리뷰를 작성했습니다." }, { status: 409 });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
