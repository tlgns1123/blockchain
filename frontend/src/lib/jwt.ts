import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const EXPIRES = "7d";
const NONCE_EXPIRES = "3m";

type AuthTokenPayload = {
  userId: string;
};

type NonceTokenPayload = {
  type: "wallet_nonce";
  userId: string;
  nonceId: string;
};

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function createNonce(userId: string): string {
  const nonceToken = jwt.sign(
    {
      type: "wallet_nonce",
      userId,
      nonceId: randomBytes(16).toString("hex"),
    } satisfies NonceTokenPayload,
    SECRET,
    { expiresIn: NONCE_EXPIRES }
  );

  return [
    "블록마켓 지갑 인증",
    "아래 문구는 로그인/지갑 연결 확인을 위한 서명입니다.",
    `token:${nonceToken}`,
  ].join("\n");
}

export function consumeNonce(userId: string, nonceMessage: string): boolean {
  const tokenLine = nonceMessage
    .split("\n")
    .find((line) => line.startsWith("token:"));

  if (!tokenLine) {
    return false;
  }

  const nonceToken = tokenLine.slice("token:".length);

  try {
    const payload = jwt.verify(nonceToken, SECRET) as Partial<NonceTokenPayload>;
    return payload.type === "wallet_nonce" && payload.userId === userId;
  } catch {
    return false;
  }
}
