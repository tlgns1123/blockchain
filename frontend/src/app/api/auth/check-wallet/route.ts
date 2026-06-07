import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { findByWallet } from "@/lib/userStore";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim().toLowerCase();

  if (!address) return NextResponse.json({ available: false, message: "지갑 주소를 입력해 주세요." });
  if (!isAddress(address)) return NextResponse.json({ available: false, message: "유효하지 않은 지갑 주소입니다." });

  const exists = await findByWallet(address);
  if (exists) return NextResponse.json({ available: false, message: "이미 다른 계정에 연결된 지갑 주소입니다." });
  return NextResponse.json({ available: true, message: "사용 가능한 지갑 주소입니다." });
}
