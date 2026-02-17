import { Like } from "../models/likes.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const likePost = asyncHandler(async (req, res) => {
  const { post_Id } = req.params;
  if (!post_Id) {
    throw new ApiError(400, "post Id is missing");
  }

  const check = await Like.findOneAndDelete({
    user_Id: req.user._id,
    post_Id,
  });
  if (check?.post_Id) {
    return res.status(200).json(new ApiResponse(200, "", "Unliked"));
  }
  const like = await Like.create({
    user_Id: req.user._id,
    post_Id,
  });
  return res.status(200).json(new ApiResponse(200, like, "Liked"));
});
const likeCourse = asyncHandler(async (req, res) => {
  const { course_Id } = req.params;
  if (!course_Id) {
    throw new ApiError(400, "post Id is missing");
  }

  const check = await Like.findOneAndDelete({
    user_Id: req.user._id,
    course_Id,
  });
  if (check?.course_Id) {
    return res.status(200).json(new ApiResponse(200, "", "Unliked"));
  }
  const like = await Like.create({
    user_Id: req.user._id,
    course_Id,
  });
  return res.status(200).json(new ApiResponse(200, like, "Liked"));
});
const likeVideo = asyncHandler(async (req, res) => {
  const { video_Id } = req.params;
  if (!video_Id) {
    throw new ApiError(400, "Id is missing");
  }

  const check = await Like.findOneAndDelete({
    user_Id: req.user._id,
    video_Id,
  });
  if (check?.video_Id) {
    return res.status(200).json(new ApiResponse(200, "", "Unliked"));
  }
  const like = await Like.create({
    user_Id: req.user._id,
    video_Id,
  });
  return res.status(200).json(new ApiResponse(200, like, "Liked"));
});
const likeComment = asyncHandler(async (req, res) => {
  const { comment_Id } = req.params;
  if (!comment_Id) {
    throw new ApiError(400, "Id is missing");
  }

  const check = await Like.findOneAndDelete({
    user_Id: req.user._id,
    comment_Id,
  });
  if (check?.comment_Id) {
    return res.status(200).json(new ApiResponse(200, "", "Unliked"));
  }
  const like = await Like.create({
    user_Id: req.user._id,
    comment_Id,
  });
  return res.status(200).json(new ApiResponse(200, like, "Liked"));
});

export { likePost, likeVideo, likeComment, likeCourse };
