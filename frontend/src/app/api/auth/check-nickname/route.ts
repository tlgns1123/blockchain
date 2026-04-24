import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models/User";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get("nickname")?.trim();
  const excludeId = req.nextUrl.searchParams.get("excludeId");

  if (!nickname || nickname.length < 2) {
    return NextResponse.json({ available: false, message: "닉네임은 2자 이상이어야 합니다." });
  }

  if (nickname.length > 20) {
    return NextResponse.json({ available: false, message: "닉네임은 20자 이하여야 합니다." });
  }

  await connectDB();

  const query: any = { nickname: new RegExp(`^${escapeRegex(nickname)}$`, "i") };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const exists = await UserModel.exists(query);
  if (exists) {
    return NextResponse.json({ available: false, message: "이미 사용 중인 닉네임입니다." });
  }

  return NextResponse.json({ available: true, message: "사용 가능한 닉네임입니다." });
}
