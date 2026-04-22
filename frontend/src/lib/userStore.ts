import { connectDB } from "./mongoose";
import { UserModel } from "./models/User";

export interface User {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  walletAddress: string | null;
}

function toUser(doc: any): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    nickname: doc.nickname,
    passwordHash: doc.passwordHash,
    walletAddress: doc.walletAddress ?? null,
  };
}

export async function findByEmail(email: string): Promise<User | undefined> {
  await connectDB();
  const doc = await UserModel.findOne({ email: email.toLowerCase() });
  return doc ? toUser(doc) : undefined;
}

export async function findById(id: string): Promise<User | undefined> {
  await connectDB();
  const doc = await UserModel.findById(id);
  return doc ? toUser(doc) : undefined;
}

export async function findByWallet(address: string): Promise<User | undefined> {
  await connectDB();
  const doc = await UserModel.findOne({ walletAddress: address.toLowerCase() });
  return doc ? toUser(doc) : undefined;
}

export async function createUser(data: {
  email: string;
  nickname: string;
  passwordHash: string;
}): Promise<User> {
  await connectDB();
  const doc = await UserModel.create(data);
  return toUser(doc);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "nickname" | "passwordHash" | "walletAddress">>
): Promise<User> {
  await connectDB();
  const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!doc) throw new Error("User not found");
  return toUser(doc);
}
