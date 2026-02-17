import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { getBlogPostData } from "./post.controller.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { video_Id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  return res.status(200).json(new ApiResponse(200, data, "Data fetched"));
});

const addPostComment = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;
  const { comment } = req.body;
  const data = await Comment.create({
    comment,
    post_Id: _id,
    user_Id: req.user?._id,
  });
  return res.status(200).json(new ApiResponse(200, data, "Post Comment added"));
});

const addCourseComment = asyncHandler(async (req, res, next) => {
  const { _id } = req.params;
  const { comment } = req.body;
  const data = await Comment.create({
    comment,
    course_Id: _id,
    user_Id: req.user?._id,
  });
  const commentData = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(data._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "user_Id",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              name: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // lookup for comments reply
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "comment_Id",
        as: "commentsReply",

        pipeline: [
          // lookup for author of coments reply
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          // lookup for likes of comment reply
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment_Id",
              as: "likes",
              pipeline: [
                {
                  $lookup: {
                    from: "users",
                    localField: "user_Id",
                    foreignField: "_id",
                    as: "author",
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          username: 1,
                          name: 1,
                          avatar: 1,
                        },
                      },
                    ],
                  },
                },

                {
                  $addFields: {
                    author: {
                      $arrayElemAt: ["$author", 0],
                    },
                  },
                },
              ],
            },
          },
          // add fields in comments reply
          {
            $addFields: {
              author: {
                $arrayElemAt: ["$author", 0],
              },
              isAuthor: {
                $cond: {
                  if: { $in: [req.user?._id, "$author._id"] },
                  then: true,
                  else: false,
                },
              },

              likeCount: {
                $size: "$likes",
              },
              isLiked: {
                $cond: {
                  if: { $in: [req.user?._id, "$likes.user_Id"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          // projection of comment reply
          {
            $project: {
              _id: 1,
              author: 1,
              isAuthor: 1,
              createdAt: 1,
              likeCount: 1,
              isLiked: 1,
              likes: 1,
              comment: 1,
            },
          },
        ],
      },
    },
    // lookup for likes of comments
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment_Id",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },

          {
            $addFields: {
              author: {
                $arrayElemAt: ["$author", 0],
              },
            },
          },
        ],
      },
    },
    // add fields in comment
    {
      $addFields: {
        author: {
          $arrayElemAt: ["$author", 0],
        },
        isAuthor: {
          $cond: {
            if: { $in: [req.user?._id, "$author._id"] },
            then: true,
            else: false,
          },
        },
        replyCount: {
          $size: "$commentsReply",
        },
        likeCount: {
          $size: "$likes",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.user_Id"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // projection in comment
    {
      $project: {
        _id: 1,
        author: 1,
        isAuthor: 1,
        comment: 1,
        createdAt: 1,
        commentsReply: 1,
        replyCount: 1,
        likeCount: 1,
        isLiked: 1,
        likes: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, commentData[0], " Comment added"));
});

const addVideoComment = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { comment } = req.body;
  const data = await Comment.create({
    comment,
    video_Id: _id,
    user_Id: req.user?._id,
  });
  const commentData = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(data._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "user_Id",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              name: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
   
    // lookup for likes of comments
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment_Id",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },

          {
            $addFields: {
              author: {
                $arrayElemAt: ["$author", 0],
              },
            },
          },
        ],
      },
    },
    // add fields in comment
    {
      $addFields: {
        author: {
          $arrayElemAt: ["$author", 0],
        },
        isAuthor: {
          $cond: {
            if: { $in: [req.user?._id, "$author._id"] },
            then: true,
            else: false,
          },
        },
       
        likeCount: {
          $size: "$likes",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.user_Id"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // projection in comment
    {
      $project: {
        _id: 1,
        author: 1,
        isAuthor: 1,
        comment: 1,
        createdAt: 1,
        likeCount: 1,
        isLiked: 1,
        likes: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, commentData[0], "Video comment added"));
});
const addCommentReply = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { comment } = req.body;
  const data = await Comment.create({
    comment,
    comment_Id: _id,
    user_Id: req.user?._id,
  });
  const commentData = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(data._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "user_Id",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              name: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
   
    // lookup for likes of comments
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment_Id",
        as: "likes",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },

          {
            $addFields: {
              author: {
                $arrayElemAt: ["$author", 0],
              },
            },
          },
        ],
      },
    },
    // add fields in comment
    {
      $addFields: {
        author: {
          $arrayElemAt: ["$author", 0],
        },
        isAuthor: {
          $cond: {
            if: { $in: [req.user?._id, "$author._id"] },
            then: true,
            else: false,
          },
        },
       
        likeCount: {
          $size: "$likes",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.user_Id"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // projection in comment
    {
      $project: {
        _id: 1,
        author: 1,
        isAuthor: 1,
        comment: 1,
        createdAt: 1,
        likeCount: 1,
        isLiked: 1,
        likes: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, commentData[0], "Comment reply added"));
});

TODO: "Test it before use";

const updateComment = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { comment } = req.body;
  const data = await Comment.findByIdAndUpdate(_id, {
    comment_Id,
    comment,
  });

  return res.status(200).json(new ApiResponse(200, data, "Comment is updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const data = await Comment.findByIdAndDelete(_id);

  return res.status(200).json(new ApiResponse(200, "", "Comment is deleted"));
});

export {
  getVideoComments,
  addPostComment,
  addCourseComment,
  addVideoComment,
  addCommentReply,
  updateComment,
  deleteComment,
};
