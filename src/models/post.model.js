import mongoose, { Schema } from "mongoose";

const post = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    author: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Post = mongoose.model("Post", post);
