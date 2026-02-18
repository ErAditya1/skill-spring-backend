import mongoose from "mongoose";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import {Enrolled} from "../models/enrolled.model.js";
import {Course} from "../models/course.model.js";
import {Video} from "../models/video.model.js";
import {QuizAttempt} from "../models/quizAttempt.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const getStudentDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  /* ------------------------------------------------ */
  /* 1️⃣ Total Enrolled Courses */
  /* ------------------------------------------------ */

  const enrolledCourses = await Enrolled.find({
    user_Id: userId,
  }).select("course_Id");

  const enrolledCourseIds = enrolledCourses.map((e) => e.course_Id);

  /* ------------------------------------------------ */
  /* 2️⃣ Completed Courses (100% watched) */
  /* ------------------------------------------------ */

  const completedCourses = await Course.aggregate([
    {
      $match: {
        _id: { $in: enrolledCourseIds },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "course_id",
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "views",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "video_Id",
              foreignField: "_id",
              as: "video",
            },
          },
          { $unwind: "$video" },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user_Id", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$video.course_id", "$$courseId"] },
                ],
              },
            },
          },
        ],
        as: "watchedVideos",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        watchedCount: { $size: "$watchedVideos" },
      },
    },
    {
      $match: {
        $expr: { $eq: ["$totalVideos", "$watchedCount"] },
      },
    },
  ]);

  /* ------------------------------------------------ */
  /* 3️⃣ Total Learning Hours */
  /* ------------------------------------------------ */

  const totalVideos = await Video.aggregate([
    {
      $match: {
        course_id: { $in: enrolledCourseIds },
      },
    },
    {
      $group: {
        _id: null,
        totalDuration: { $sum: "$durations" }, // duration stored in seconds
      },
    },
  ]);

  const totalHours = totalVideos[0]
    ? Math.round(totalVideos[0].totalDuration / 3600)
    : 0;

  /* ------------------------------------------------ */
  /* 4️⃣ Certificates (Completed Courses Count) */
  /* ------------------------------------------------ */

  const certificates = completedCourses.length;

  /* ------------------------------------------------ */
  /* 5️⃣ Continue Learning */
  /* ------------------------------------------------ */

  const continueLearning = await Course.aggregate([
    {
      $match: {
        _id: { $in: enrolledCourseIds },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "course_id",
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "views",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "video_Id",
              foreignField: "_id",
              as: "video",
            },
          },
          { $unwind: "$video" },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user_Id", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$video.course_id", "$$courseId"] },
                ],
              },
            },
          },
        ],
        as: "watchedVideos",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        watchedCount: { $size: "$watchedVideos" },
        progress: {
          $cond: [
            { $eq: [{ $size: "$videos" }, 0] },
            0,
            {
              $multiply: [
                {
                  $divide: [
                    { $size: "$watchedVideos" },
                    { $size: "$videos" },
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        progress: { $round: ["$progress", 0] },
      },
    },
  ]);

  /* ------------------------------------------------ */
  /* Final Response */
  /* ------------------------------------------------ */

  return res.status(200).json(
    new ApiResponse(200, {
      stats: {
        totalEnrolled: enrolledCourseIds.length,
        completedCourses: completedCourses.length,
        totalHours,
        certificates,
      },
      continueLearning,
      enrolledCourses: enrolledCourseIds.map((id) => ({ _id: id })),
    }, "Student dashboard fetched successfully")
  );
});
