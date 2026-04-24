import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI 환경변수가 설정되지 않았습니다.");
}

const uriDbName =
  MONGODB_URI.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/)?.[1] || "";

const MONGODB_DB_NAME =
  process.env.MONGODB_DB_NAME ||
  (uriDbName ? decodeURIComponent(uriDbName) : "web3market");

const cached = (global as typeof globalThis & {
  __mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}).__mongoose ?? { conn: null, promise: null };

(global as typeof globalThis & {
  __mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}).__mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
