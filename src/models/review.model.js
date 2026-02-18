import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    user_Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course_Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ user_Id: 1, course_Id: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
