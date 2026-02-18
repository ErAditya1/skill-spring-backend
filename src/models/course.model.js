import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
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
    },
    language: {
      type: String,
      enum: ["English", "Hindi"],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    printPrice: {
      type: Number,
    },
    sellingPrice: {
      type: Number,
    },
    // 🔥 Approval Workflow Status
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    discount: {
      type: Number,
    },
    from: {
      type: Date,
    },
    to: {
      type: Date,
    },
    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Course = mongoose.model("Course", courseSchema);
