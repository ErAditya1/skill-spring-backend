import mongoose, { Schema } from "mongoose";
const videoSchema = new Schema(
  {
    videoId: {
      type: String,
      required: true,
    },
    videoType: {
      type: String,
      required: true,
    },
    thumbnail: {
      public_id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    course_id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      // default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Video = mongoose.model("Video", videoSchema);
