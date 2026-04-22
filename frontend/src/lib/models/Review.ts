import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  listingId: string;
  reviewer: string;   // wallet address lowercase
  reviewee: string;   // wallet address lowercase
  rating: number;     // 1–5
  comment: string;
  role: "buyer" | "seller";
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    listingId: { type: String, required: true },
    reviewer:  { type: String, required: true, lowercase: true },
    reviewee:  { type: String, required: true, lowercase: true },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, default: "", maxlength: 200 },
    role:      { type: String, enum: ["buyer", "seller"], required: true },
  },
  { timestamps: true }
);

// 같은 거래에 같은 리뷰어는 1회만
ReviewSchema.index({ listingId: 1, reviewer: 1 }, { unique: true });

export const ReviewModel =
  mongoose.models.Review ?? mongoose.model<IReview>("Review", ReviewSchema);
