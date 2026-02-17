import mongoose, { Schema } from "mongoose";
const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    course_Id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thumbnail: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
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

export const Quiz = mongoose.model("Quiz", quizSchema);
