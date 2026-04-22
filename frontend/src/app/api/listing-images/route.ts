import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ExtraImageModel } from "@/lib/models/ExtraImage";
import { getAuthUser } from "@/lib/authMiddleware";

// GET /api/listing-images?listingId=xxx
export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ images: [] });

  await connectDB();
  const doc = await ExtraImageModel.findOne({ listingId }).lean();
  return NextResponse.json({ images: (doc as any)?.images ?? [] });
}

// POST /api/listing-images  { listingId, images: string[] }
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { listingId, images } = await req.json();
  if (!listingId || !Array.isArray(images))
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

  await connectDB();
  await ExtraImageModel.findOneAndUpdate(
    { listingId },
    { images: images.slice(0, 9) }, // 최대 9장 추가 (메인 포함 10장)
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
