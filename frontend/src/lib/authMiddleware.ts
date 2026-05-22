import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import { findById } from "./userStore";
import type { User } from "./userStore";

export async function getAuthUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return (await findById(payload.userId)) ?? null;
}

const SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function setCookieHeader(token: string) {
  return `auth_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${SECURE}`;
}

export function clearCookieHeader() {
  return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${SECURE}`;
}
