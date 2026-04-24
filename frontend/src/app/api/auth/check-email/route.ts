import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models/User";
import { EMAIL_REGEX } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) return NextResponse.json({ available: false, message: "이메일을 입력해 주세요." });
  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ available: false, message: "올바른 이메일 형식이 아닙니다." });

  await connectDB();
  const exists = await UserModel.exists({ email });
  if (exists) return NextResponse.json({ available: false, message: "이미 사용 중인 이메일입니다." });
  return NextResponse.json({ available: true, message: "사용 가능한 이메일입니다." });
}
