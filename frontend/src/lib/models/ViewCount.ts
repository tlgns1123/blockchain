import mongoose from "mongoose";

const viewCountSchema = new mongoose.Schema({
  listingId: { type: String, required: true, unique: true },
  count:     { type: Number, default: 0 },
});

export const ViewCountModel =
  mongoose.models.ViewCount || mongoose.model("ViewCount", viewCountSchema);
