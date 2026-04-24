import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ViewCountModel } from "@/lib/models/ViewCount";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("listingIds")?.split(",").filter(Boolean);
  if (!ids?.length) return NextResponse.json({});

  await connectDB();
  const docs = await ViewCountModel.find({ listingId: { $in: ids } }).lean();
  const result: Record<string, number> = {};

  for (const doc of docs) {
    result[doc.listingId] = doc.count;
  }

  for (const id of ids) {
    if (!(id in result)) {
      result[id] = 0;
    }
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId가 필요합니다." }, { status: 400 });

  await connectDB();
  const doc = await ViewCountModel.findOneAndUpdate(
    { listingId: String(listingId) },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  return NextResponse.json({ count: doc.count });
}
