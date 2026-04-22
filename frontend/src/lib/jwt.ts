import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const EXPIRES = "7d";

export function signToken(payload: { userId: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// 2FA 임시 nonce 저장소 (메모리, 서버 재시작 시 초기화)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

export function createNonce(userId: string): string {
  const nonce = `블록마켓 로그인 인증\nnonce: ${randomBytes(16).toString("hex")}\n시간: ${Date.now()}`;
  nonceStore.set(userId, { nonce, expiresAt: Date.now() + 3 * 60 * 1000 }); // 3분
  return nonce;
}

export function consumeNonce(userId: string): string | null {
  const entry = nonceStore.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    nonceStore.delete(userId);
    return null;
  }
  nonceStore.delete(userId);
  return entry.nonce;
}
