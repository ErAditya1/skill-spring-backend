import mongoose, { Schema } from "mongoose";

const quizAttemptSchema = new Schema(
  {
    quiz_Id: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    user_Id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [
      {
        question_Id: {
          type: Schema.Types.ObjectId,
          ref: "QuizQuestion",
          required: true,
        },
        answer: {
          type: String, // The user's selected answer
          required: true,
        },
        isCorrect: {
          type: Boolean, // Whether the answer is correct or not
          default: false,
        },
      },
    ],
    score: {
      type: Number,
      default: 0, // User's score based on correct answers
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "in-progress"],
      default: "in-progress", // To track if the quiz is completed or not
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
