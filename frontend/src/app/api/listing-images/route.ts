import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ExtraImageModel } from "@/lib/models/ExtraImage";
import { getAuthUser } from "@/lib/authMiddleware";
import { getListingSnapshot, isServerChainReady } from "@/lib/serverChain";

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ images: [] });

  await connectDB();
  const doc = await ExtraImageModel.findOne({ listingId }).lean();
  return NextResponse.json({ images: (doc as any)?.images ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isServerChainReady()) {
    return NextResponse.json({ error: "온체인 검증 설정이 없습니다." }, { status: 503 });
  }

  const { listingId, images } = await req.json();
  if (!listingId || !Array.isArray(images)) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const listing = await getListingSnapshot(String(listingId));
  if (!listing) {
    return NextResponse.json({ error: "상품 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (listing.seller.toLowerCase() !== user.walletAddress.toLowerCase()) {
    return NextResponse.json({ error: "본인 상품의 이미지로만 수정할 수 있습니다." }, { status: 403 });
  }

  const sanitizedImages = images
    .filter((image: unknown): image is string => typeof image === "string")
    .map((image) => image.trim())
    .filter(Boolean)
    .slice(0, 9);

  await connectDB();
  await ExtraImageModel.findOneAndUpdate(
    { listingId: String(listingId) },
    { images: sanitizedImages },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
