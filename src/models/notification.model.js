import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["chat", "course", "video", "like", "comment", "follow"],
      required: true,
    }, // The type of notification
    users: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isRead: { type: Boolean, default: false },
      },
    ], // Users to receive the notification

    createdAt: { type: Date, default: Date.now },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // Optional: Reference to specific content
    referenceType: { type: String }, // Used to specify the type of content (course, video, etc.)
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who triggered the notification (useful for likes/comments)
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", NotificationSchema);
