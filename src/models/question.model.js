import mongoose, { Schema } from "mongoose";
const quizQuestion = new Schema(
  {
    question: { type: String, required: true },

    options: {
      type: [String],
      required: true,
    },
    answer: { type: String, required: true},
    quiz_Id: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    explanation:{
        type: String
    },
  },
  {
    timestamps: true,
  }
);

export const QuizQuestion = mongoose.model("QuizQuestion", quizQuestion);
