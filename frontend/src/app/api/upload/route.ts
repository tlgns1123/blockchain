import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/authMiddleware";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user?.walletAddress) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP, GIF 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", filename);

  await mkdir(path.dirname(uploadPath), { recursive: true });
  await writeFile(uploadPath, buffer);

  const localPath = `/uploads/${filename}`;
  return NextResponse.json({ url: localPath, hash: localPath });
}
