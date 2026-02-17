import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  deleteCloudinaryFile,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizQuestion } from "../models/question.model.js";
import { QuizAttempt } from "../models/quizAttempt.model.js";

const postQuiz = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { _id } = req.params;

  if (!title || !description) {
    throw new ApiError(400, "Title and Description are required");
  }

  const newPost = await Quiz.create({
    title,
    description,
    author: req.user._id,
    course_Id: _id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, newPost, "Quiz Added successfully"));
});

const getQuiz = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  const quizData = await Quiz.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(_id) },
    },
    {
      $lookup: {
        from: "quizquestions",
        localField: "_id",
        foreignField: "quiz_Id",
        as: "questions",
      },
    },

    {
      $project: {
        title: 1,
        description: 1,
        isPublished: 1,
        thumbnail: 1,
        isFree: 1,
        author: 1,
        course_Id: 1,
        isPublished: 1,
        questions: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, quizData[0], "Quiz retrieved successfully"));
});

const updateTitle = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const { _id } = req.params;
  const quiz = await Quiz.findByIdAndUpdate(_id, { title }, { new: true });
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  res.json(new ApiResponse(200, quiz, "Quiz title updated successfully"));
});

const updateDescription = asyncHandler(async (req, res) => {
  const { description } = req.body;
  const { _id } = req.params;
  const quiz = await Quiz.findByIdAndUpdate(
    _id,
    { description },
    { new: true }
  );
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  res.json(new ApiResponse(200, quiz, "Quiz description updated successfully"));
});

const updateThumbnail = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file || !file.path) {
    throw new ApiError(400, "No file uploaded");
  }
  const { _id } = req.params;

  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  const oldThumbnail = quiz.thumbnail;
  if (oldThumbnail) {
    await deleteCloudinaryFile(oldThumbnail.public_id);
  }
  const newThumbnail = await uploadOnCloudinary(file.path, "thumbnails");
  const newQuiz = await Quiz.findByIdAndUpdate(
    _id,
    {
      thumbnail: {
        public_id: newThumbnail.public_id,
        url: newThumbnail.secure_url,
      },
    },
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, newQuiz, "Quiz thumbnail updated successfully"));
});

const quizVisibility = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const quiz = await Quiz.findById(_id);

  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  if (quiz.isFree) {
    quiz.isFree = false;
    await quiz.save();
  } else {
    quiz.isFree = true;
    await quiz.save();
  }
  res.json(new ApiResponse(200, quiz, "Quiz visibility updated successfully"));
});

const quizPublish = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  if (quiz.isPublished) {
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      quiz.id,
      {
        isPublished: false,
      },
      { new: true }
    );

    return res.json(new ApiResponse(200, updatedQuiz, "Quiz Unpublished"));
  }

  const quizData = await Quiz.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "quizquestions",
        localField: "_id",
        foreignField: "quiz_Id",
        as: "questions",
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        author: 1,
        course_Id: 1,
        thumbnail: 1,
        visibility: 1,
        isPublished: 1,
        questions: 1,
      },
    },
  ]);
  const data = quizData[0];
  console.log(quizData);

  if (!data.title) throw new ApiError(404, "Title not provided");
  if (!data.description) throw new ApiError(404, "Description not provided");
  if (!data.thumbnail) throw new ApiError(404, "Thumbnail not provided");
  if (data.questions.length === 0)
    throw new ApiError(404, "Questions are not provided");

  quiz.isPublished = true;
  await quiz.save();
  res.json(new ApiResponse(200, quiz, "Quiz Published"));
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const quiz = await Quiz.findByIdAndDelete(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  const quizQuestions = await QuizQuestion.deleteMany({ quiz_Id: _id });
  res.json(new ApiResponse(200, quiz, "Quiz deleted successfully"));
});

const addQuestion = asyncHandler(async (req, res) => {
  const { question, answer, options, explanation } = req.body;
  const { _id } = req.params;
  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }
  const newQuestion = await QuizQuestion.create({
    question,
    answer,
    options,
    quiz_Id: _id,
    author: req.user._id,
    explanation,
  });

  res
    .status(201)
    .json(new ApiResponse(201, newQuestion, "Question added successfully"));
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const question = await QuizQuestion.findByIdAndDelete(_id);
  if (!question) {
    throw new ApiError(404, "Question not found");
  }
  res.json(new ApiResponse(200, question, "Question deleted successfully"));
});

const getQuizQuestions = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  const questions = await QuizQuestion.find({ quiz_Id: _id });
  const attemptResult = await QuizAttempt.findOne({
    quiz_Id: _id,
    user_Id: req.user._id,
  });


  const quizData = await Quiz.aggregate([
    {
      $match: {
        $and: [
          { _id: new mongoose.Types.ObjectId(_id) },
          { isPublished: true },
        ],
      },
    },
    {
      $lookup: {
        from: "quizquestions",
        localField: "_id",
        foreignField: "quiz_Id",
        as: "questions",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "course_Id",
        foreignField: "_id",
        as: "course",
        pipeline: [
          {
            $lookup: {
              from: "enrolleds",
              localField: "_id",
              foreignField: "course_Id",
              as: "enrolled",
              pipeline: [
                {
                  $match: {
                    user_Id: new mongoose.Types.ObjectId(req.user._id), // Match current user
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isEnrolled: {
          $cond: [{ $eq: ["$enrolled.length", 0] }, false, true],
        },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        course_Id: 1,
        thumbnail: 1,
        visibility: 1,
        isPublished: 1,
        questions: 1,
        isEnrolled: 1,
      },
    },
  ]);

  if (!quizData[0].isFree && !quizData[0].isEnrolled) {
    throw new ApiError(403, "You are not authorized in this Quiz");
  }

  res.json(
    new ApiResponse(200, {attemptResult, questions,quizData:quizData[0]}, "Quiz questions retrieved successfully")
  );
});

const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const { _id } = req.params;

  // Fetch the quiz and questions
  const quiz = await Quiz.findById(_id);
  const questions = await QuizQuestion.find({ quiz_Id: _id });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  // Calculate the score
  let score = 0;
  questions.forEach((question, index) => {
    if (answers[index] === question.answer) {
      score++;
    }
  });

  // Respond with the score
  res.json(
    new ApiResponse(
      200,
      { score, totalQuestions: questions.length },
      "Quiz submitted successfully"
    )
  );
});

const attemptQuiz = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { answers } = req.body;

  const quiz = await Quiz.findById(_id);
  if (!quiz) {
    throw new ApiError(404, "Quiz not found");
  }

  // Check if all answers are provided
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw new ApiError(400, "No answers provided");
  }

  const isAttempted = await QuizAttempt.find({
    quiz_Id: _id,
    user_Id: req.user._id,
  });
  if (isAttempted.length ===2) {
    throw new ApiError(400, "You have already attempted 2 times this quiz");
  }

  const questions = await QuizQuestion.find({ quiz_Id: _id });
  if (questions.length === 0) {
    throw new ApiError(404, "No questions found for this quiz");
  }

  // Calculate score and determine if the answer is correct
  let score = 0;
  const answersWithResult = answers.map((userAnswerIndex, index) => {
    const question = questions[index]; // Get the question corresponding to the index

    if (!question) {
      console.log("No question found for");
      return {
        questionId: null,
        answer: userAnswerIndex,
        isCorrect: false, // If the question doesn't exist, treat it as incorrect
      };
    }

    // Check if the selected answer's index matches the correct answer index
    const isCorrect = question.answer === question.options[userAnswerIndex]; // Compare index, not the answer string
    if (isCorrect) score++;

    return {
      question_Id: question._id, // Ensure that the `questionId` is properly set here
      answer: question.options[userAnswerIndex],
      isCorrect,
    };
  });

  // Save the user's attempt to the database
  const quizAttempt = new QuizAttempt({
    quiz_Id: _id,
    user_Id: req.user._id,
    answers: answersWithResult,
    score,
    totalQuestions: questions.length,
    status: "completed",
    submittedAt: new Date(),
  });

  await quizAttempt.save();

  // Respond with the result
  res.json(
    new ApiResponse(
      200,
      { score, totalQuestions: questions.length, answers: answersWithResult ,questions},
      "Quiz attempt saved successfully"
    )
  );
});

export {
  postQuiz,
  getQuiz,
  updateTitle,
  updateDescription,
  updateThumbnail,
  quizVisibility,
  quizPublish,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  submitQuizAttempt,
  getQuizQuestions,
  attemptQuiz,
};
