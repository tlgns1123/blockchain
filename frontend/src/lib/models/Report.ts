import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  listingId: string;
  reporterId: string; // userId from JWT
  reason: string;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    listingId:  { type: String, required: true },
    reporterId: { type: String, required: true },
    reason:     { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true }
);

// 같은 유저가 같은 상품을 중복 신고 불가
ReportSchema.index({ listingId: 1, reporterId: 1 }, { unique: true });

export const ReportModel =
  mongoose.models.Report ?? mongoose.model<IReport>("Report", ReportSchema);
