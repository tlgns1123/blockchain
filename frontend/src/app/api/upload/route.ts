import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/authMiddleware";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "JPG, PNG, WEBP, GIF만 업로드 가능합니다." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Pinata IPFS 업로드 (PINATA_JWT 설정 시) ───────────────────────────────
  const pinataJwt = process.env.PINATA_JWT;
  if (pinataJwt) {
    const fd = new FormData();
    fd.append("file", new Blob([buffer], { type: file.type }), file.name);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${pinataJwt}` },
      body: fd,
    });

    if (res.ok) {
      const data = await res.json();
      const hash: string = data.IpfsHash;
      return NextResponse.json({
        url: `https://ipfs.io/ipfs/${hash}`,
        hash,
      });
    }
  }

  // ── 로컬 저장 (fallback) ──────────────────────────────────────────────────
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", filename);
  await writeFile(uploadPath, buffer);

  const localPath = `/uploads/${filename}`;
  return NextResponse.json({ url: localPath, hash: localPath });
}
