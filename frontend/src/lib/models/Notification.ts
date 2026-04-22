import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    to:           { type: String, required: true, lowercase: true },
    type:         { type: String, enum: ["purchase", "confirm", "open_bid", "blind_bid"], required: true },
    listingId:    { type: String, required: true },
    listingTitle: { type: String, default: "" },
    message:      { type: String, required: true },
    read:         { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ to: 1, read: 1 });
notificationSchema.index({ to: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
