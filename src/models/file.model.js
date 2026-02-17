import mongoose, { Schema } from "mongoose";

const fileSchema = new Schema(
  {
    user_Id:{
      type: mongoose.Types.ObjectId,
      ref: "User"
    },
    video_Id:{
      type: mongoose.Types.ObjectId,
      ref : "Course"
    },
    title: {
      type: "string",
      required: true,
    },
    file: {
      public_id:{
        type: String,
        required: true,
      },
      url:{
        type: String,
        required: true,
      },

    },
  },
  { timestamps: true }
);

export const File = mongoose.model("File", fileSchema);
