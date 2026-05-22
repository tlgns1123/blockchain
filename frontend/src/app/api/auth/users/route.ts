import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  const wallets = req.nextUrl.searchParams.get("wallets");
  if (!wallets) return NextResponse.json({});

  const addrs = wallets
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 100);

  if (addrs.length === 0) return NextResponse.json({});

  await connectDB();
  const users = await UserModel.find(
    { walletAddress: { $in: addrs } },
    { walletAddress: 1, nickname: 1, _id: 0 }
  ).lean();

  const result: Record<string, string> = {};
  for (const u of users as { walletAddress: string; nickname: string }[]) {
    if (u.walletAddress && u.nickname) {
      result[u.walletAddress.toLowerCase()] = u.nickname;
    }
  }

  return NextResponse.json(result);
}
