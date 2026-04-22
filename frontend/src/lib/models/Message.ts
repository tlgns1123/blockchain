import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true },
    from:      { type: String, required: true, lowercase: true },
    to:        { type: String, required: true, lowercase: true },
    content:   { type: String, required: true, trim: true, maxlength: 1000 },
    read:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ listingId: 1, from: 1, to: 1 });
messageSchema.index({ to: 1, read: 1 });

export const MessageModel =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
