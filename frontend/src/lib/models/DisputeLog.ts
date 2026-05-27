import mongoose, { Schema, Document } from "mongoose";

export interface IDisputeLog extends Document {
  contractAddress: string;
  listingId:       string;
  listingTitle:    string;
  seller:          string;
  buyer:           string;
  price:           string; // bigint → string
  resolution:      "refund_buyer" | "pay_seller";
  reason:          string;
  resolvedBy:      string;
  createdAt:       Date;
}

const DisputeLogSchema = new Schema<IDisputeLog>(
  {
    contractAddress: { type: String, required: true, lowercase: true },
    listingId:       { type: String, required: true },
    listingTitle:    { type: String, default: "" },
    seller:          { type: String, required: true, lowercase: true },
    buyer:           { type: String, required: true, lowercase: true },
    price:           { type: String, required: true },
    resolution:      { type: String, enum: ["refund_buyer", "pay_seller"], required: true },
    reason:          { type: String, required: true, maxlength: 500 },
    resolvedBy:      { type: String, required: true, lowercase: true },
  },
  { timestamps: true }
);

export const DisputeLogModel =
  mongoose.models.DisputeLog ?? mongoose.model<IDisputeLog>("DisputeLog", DisputeLogSchema);
