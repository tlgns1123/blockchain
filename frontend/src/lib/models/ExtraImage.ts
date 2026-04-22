import mongoose, { Schema, Document } from "mongoose";

export interface IExtraImage extends Document {
  listingId: string;
  images: string[]; // IPFS hashes or /uploads/* URLs
}

const ExtraImageSchema = new Schema<IExtraImage>(
  {
    listingId: { type: String, required: true, unique: true },
    images:    [{ type: String }],
  },
  { timestamps: true }
);

export const ExtraImageModel =
  mongoose.models.ExtraImage ??
  mongoose.model<IExtraImage>("ExtraImage", ExtraImageSchema);
