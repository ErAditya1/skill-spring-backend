import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    avatar:{
      public_id: {
        type: String,
      },
      url:{
        type: String,
      }
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    course_Id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);
