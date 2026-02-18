import mongoose, { Schema, Types } from "mongoose";

const enrolledSchema = new Schema(
  {
    user_Id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_Id: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
    },
    transaction_Id: {
      type: String,
    },
    cost: {
      type: String,
    },
    completedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    lastWatchedVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },

    lastPlayedTime: {
      type: Number,
      default: 0, // seconds
    },
    progress: {
      type: Number,
      default: 0, // percentage
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    certificateIssued: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Enrolled = mongoose.model("Enrolled", enrolledSchema);
