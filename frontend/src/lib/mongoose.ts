import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI 환경변수가 설정되지 않았습니다.");

// Next.js 개발 모드 핫리로드 시 연결 중복 방지
const cached = (global as any).__mongoose ?? { conn: null, promise: null };
(global as any).__mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
