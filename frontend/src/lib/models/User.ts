import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  nickname: string;
  passwordHash: string;
  walletAddress: string | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  nickname:      { type: String, required: true, unique: true, trim: true },
  passwordHash:  { type: String, required: true },
  walletAddress: { type: String, default: null },
}, { timestamps: true });

export const UserModel = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
