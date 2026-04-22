import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authMiddleware";
import { connectDB } from "@/lib/mongoose";
import { ViewCountModel } from "@/lib/models/ViewCount";

// GET /api/views?listingIds=1,2,3  — 여러 listing 조회수 일괄 조회
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("listingIds")?.split(",").filter(Boolean);
  if (!ids?.length) return NextResponse.json({});

  await connectDB();
  const docs = await ViewCountModel.find({ listingId: { $in: ids } }).lean();
  const result: Record<string, number> = {};
  for (const doc of docs) result[doc.listingId] = doc.count;
  // 없는 항목은 0
  for (const id of ids) if (!(id in result)) result[id] = 0;

  return NextResponse.json(result);
}

// POST /api/views  — 조회수 1 증가 (로그인 필요)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId 필요" }, { status: 400 });

  await connectDB();
  const doc = await ViewCountModel.findOneAndUpdate(
    { listingId },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  return NextResponse.json({ count: doc.count });
}
