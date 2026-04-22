import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { ReportModel } from "@/lib/models/Report";
import { getAuthUser } from "@/lib/authMiddleware";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { listingId, reason } = await req.json();
  if (!listingId || !reason)
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

  await connectDB();

  try {
    await ReportModel.create({
      listingId,
      reporterId: user.id,
      reason: reason.slice(0, 200),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    if (e.code === 11000)
      return NextResponse.json({ error: "이미 신고한 상품입니다." }, { status: 409 });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
