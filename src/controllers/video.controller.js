import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  deleteCloudinaryFile,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Course } from "../models/course.model.js";
import { Post } from "../models/post.model.js";
import { File } from "../models/file.model.js";
import { View } from "../models/view.model.js";

import natural from "natural";

export const getVideoInfo = (url) => {
  // Regular expressions for different YouTube URLs
  
  // 1. Match standard YouTube long video URL (youtube.com/watch?v=videoId)
  const longVideoRegex = /^(?:https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?v=|v\/))([a-zA-Z0-9_-]{11})(?:[?&][^#]*)?$/;

  // 2. Match YouTube Shorts URL (youtube.com/shorts/videoId)
  const shortsRegex = /^(?:https?:\/\/(?:www\.)?youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[?&][^#]*)?$/;

  // 3. Match shortened YouTube URL (youtu.be/videoId)
  const youtuBeRegex = /^(?:https?:\/\/(?:www\.)?youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&][^#]*)?$/;

  // Check for standard long video URL
  const longMatch = url.match(longVideoRegex);
  if (longMatch) {
    return {
      videoId: longMatch[1],
      videoType: 'long',
    };
  }

  // Check for Shorts URL
  const shortsMatch = url.match(shortsRegex);
  if (shortsMatch) {
    return {
      videoId: shortsMatch[1],
      videoType: 'short',
    };
  }

  // Check for shortened URL (youtu.be)
  const youtuBeMatch = url.match(youtuBeRegex);
  if (youtuBeMatch) {
    return {
      videoId: youtuBeMatch[1],
      videoType: 'long',
    };
  }

  // If URL doesn't match any expected formats, throw an error
  throw new ApiError(404, 'Invalid YouTube URL');
};



const addVideo = asyncHandler(async (req, res) => {
  const { title, description, videoUrl } = req.body;
  const file = req.file;
  if (!file) {
    throw new ApiError(404, "Thumbnail is required");
  }

  if (!title || !description || !videoUrl) {
    throw new ApiError(404, "All fields are required");
  }
  const {videoId, videoType} = getVideoInfo(videoUrl)

  const isVideo = await Video.findOne({
    videoId,
  })
  if (isVideo) {
    throw new ApiError(404, "Video with the given ID already exists");
  }

  const thumbnail = await uploadOnCloudinary(file?.path);

  const video = await Video.create({
    title,
    description,
    videoId,
    videoType,
    thumbnail: {
      public_id: thumbnail?.public_id,
      secure_url: thumbnail?.secure_url,
    },
    author: req.user._id,
    isPublished: true,
  });
  if (!video) {
    throw new ApiError(500, "Failed to create video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video added successfully"));
});

const getVideo = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  const video = await Video.findById(_id);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  console.log("Video", video);
  return res.json(new ApiResponse(200, video, "Video fetched successfully"));
});

const getAdminVideo = asyncHandler(async (req, res) => {
  const video = await Video.find({
    author: req.user._id,
  }).select("_id");

  return res.json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideoId = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { videoId } = req.body;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!videoId) {
    throw new ApiError(404, "Video ID is required");
  }

  const video = await Video.findByIdAndUpdate(_id, { videoId }, { new: true });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video ID updated successfully"));
});

const updateTitle = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { title } = req.body;

  console.log(_id);

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!title) {
    throw new ApiError(404, "Title is required");
  }

  const video = await Video.findByIdAndUpdate(_id, { title }, { new: true });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video title updated successfully"));
});

const updateDescription = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { description } = req.body;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!description) {
    throw new ApiError(404, "Description is required");
  }

  const video = await Video.findByIdAndUpdate(
    _id,
    { description },
    { new: true }
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Video description updated successfully")
    );
});

const updateThumbnail = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const thumbnailFilePath = req.file?.path;

  if (!thumbnailFilePath) throw new ApiError(404, "File not found");

  let thumbnailFile;
  if (thumbnailFilePath) {
    thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);
  }
  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!thumbnailFile) throw new ApiError(500, "Thumbnail upload faild");

  const video = await Video.findById(_id);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Delete old thumbnail from cloudinary
  if (video.thumbnail) {
    await deleteCloudinaryFile(video.thumbnail.public_id);
  }

  video.thumbnail.public_id = thumbnailFile?.public_id;
  video.thumbnail.secure_url = thumbnailFile?.secure_url;

  const newVideo = await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, newVideo, "Video thumbnail updated successfully")
    );
});

const updateVisibility = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { isFree } = req.body;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!isFree) {
    throw new ApiError(404, "Visibility is required");
  }

  const video = await Video.findByIdAndUpdate(
    _id,
    { isFree: isFree == "true" ? true : false },
    { new: true }
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video visibility updated successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }

  const video = await Video.findById(_id);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!video.title) {
    throw new ApiError(401, "Video title is required");
  }
  if (!video.description) {
    throw new ApiError(401, "Video description is required");
  }
  if (!video.videoId) {
    throw new ApiError(401, "Video ID is required");
  }
  if (!video.thumbnail?.public_id) {
    throw new ApiError(401, "Video thumbnail is required");
  }

  video.isPublished = true;
  video.publishedAt = new Date();

  const response = await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Video published successfully"));
});

const unpublishVideo = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }

  const video = await Video.findByIdAndUpdate(
    _id,
    { isPublished: false },
    { new: true }
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Unpublished successfully"));
});

TODO: "fix to the deletion";

const deleteVideo = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  const video = await Video.findById(_id);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Delete video from database
  await Video.findByIdAndDelete(_id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const addFile = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const filePath = req.file?.path;

  if (!_id) {
    throw new ApiError(404, "Video ID is required");
  }
  if (!filePath) {
    throw new ApiError(404, "File is required");
  }

  const file = await uploadOnCloudinary(filePath);
  if (!file) {
    throw new ApiError(500, "File upload failed");
  }

  const newFile = await File.create({
    video_Id: _id,
    user_Id: req.user._id,
    title: req.body?.title,
    file: {
      public_id: file.public_id,
      url: file.secure_url,
    },
  });

  if (!newFile) {
    throw new ApiError(500, "Failed to create file in database");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newFile, "File added successfully"));
});
const deleteFile = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Video Id or File Id is required");
  }

  const file = await File.findByIdAndDelete(_id);

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  // Delete file from cloudinary
  await deleteCloudinaryFile(file.file.public_id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "File deleted successfully"));
});

const getVideoData = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Video Id is required");
  }
  const videoData = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    // Getting author of the video
    {
      $lookup: {
        from: "users",
        localField: "author",
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

    // getting comments about video
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video_Id",
        as: "comments",
        pipeline: [
          // Lookup for comment author
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
        ],
      },
    },
    // getting likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video_Id",
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
    // getting views
    {
      $lookup: {
        from: "views",
        localField: "_id",
        foreignField: "video_Id",
        as: "viewers",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "viewer",
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
              viewer: {
                $arrayElemAt: ["$viewer", 0],
              },
            },
          },
          {
            $project: {
              _id: 1,
              viewer: 1,
            },
          },
        ],
      },
    },
    // getting files
    {
      $lookup: {
        from: "files",
        localField: "_id",
        foreignField: "video_Id",
        as: "files",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              file: 1,
            },
          },
        ],
      },
    },
    // adding fields
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
        uploadedDate: {
          $toDate: "$createdAt", // Convert the timestamp to a Date object
        },

        commentCount: {
          $size: "$comments",
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
        views: {
          $size: "$viewers",
        },
      },
    },
    // projection
    {
      $project: {
        author: 1,
        isAuthor: 1,
        videoId: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        durations: 1,
        comments: 1,
        commentCount: 1,
        likeCount: 1,
        isLiked: 1,
        likes: 1,
        isFree: 1,
        views: 1,
        viewers: 1,
        uploadedDate: 1,
        files: 1,
        isPublished:1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, videoData[0], "Video all deta fetched successfully")
    );
});
const getPlayingVideo = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Video Id is required");
  }
  const video = await Video.findOne({
    videoId: _id,
  });
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const videoData = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(video?._id),
      },
    },

    // collect fallowings
    {
      $lookup: {
        from: "follows",
        localField: "author",
        foreignField: "follower",
        as: "followings",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "following",
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
            $lookup: {
              from: "follows",
              localField: "follower",
              foreignField: "following",
              as: "follower",
              pipeline: [
                {
                  $project: {
                    following: 1,
                    follower: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "follows",
              localField: "follower",
              foreignField: "follower",
              as: "following",
              pipeline: [
                {
                  $project: {
                    following: 1,
                    follower: 1,
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

              isFollowingToMe: {
                $cond: {
                  if: { $in: [req.user?._id, "$following.following"] },
                  then: true,
                  else: false,
                },
              },
              isIamFollowing: {
                $cond: {
                  if: { $in: [req.user?._id, "$follower.follower"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              author: 1,
              isFollowingToMe: 1,
              isIamFollowing: 1,
              following: 1,
              follower: 1,
            },
          },
        ],
      },
    },
    // collect fallowers
    {
      $lookup: {
        from: "follows",
        localField: "author",
        foreignField: "following",
        as: "followers",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "follower",
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
            $lookup: {
              from: "follows",
              localField: "follower",
              foreignField: "following",
              as: "follower",
              pipeline: [
                {
                  $project: {
                    following: 1,
                    follower: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "follows",
              localField: "follower",
              foreignField: "follower",
              as: "following",
              pipeline: [
                {
                  $project: {
                    following: 1,
                    follower: 1,
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
              isFollowingToMe: {
                $cond: {
                  if: { $in: [req.user?._id, "$following.following"] },
                  then: true,
                  else: false,
                },
              },
              isIamFollowing: {
                $cond: {
                  if: { $in: [req.user?._id, "$follower.follower"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              author: 1,
              isFollowingToMe: 1,
              isIamFollowing: 1,
              following: 1,
              follower: 1,
            },
          },
        ],
      },
    },
    // Getting author of the video
    {
      $lookup: {
        from: "users",
        localField: "author",
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
     // getting files
     {
      $lookup: {
        from: "files",
        localField: "_id",
        foreignField: "video_Id",
        as: "files",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              file: 1,
            },
          },
        ],
      },
    },

    // getting comments about video
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video_Id",
        as: "comments",
        pipeline: [
          // Lookup for comment author
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
        ],
      },
    },
    // getting likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video_Id",
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
    // getting views
    {
      $lookup: {
        from: "views",
        localField: "_id",
        foreignField: "video_Id",
        as: "viewers",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user_Id",
              foreignField: "_id",
              as: "viewer",
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
              viewer: {
                $arrayElemAt: ["$viewer", 0],
              },
            },
          },
          {
            $project: {
              _id: 1,
              viewer: 1,
            },
          },
        ],
      },
    },
    // adding fields
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
        followersCount: {
          $size: "$followers",
        },
        isFollowing: {
          $cond: {
            if: { $in: [req.user?._id, "$followers.author._id"] },
            then: true,
            else: false,
          },
        },
        uploadedDate: {
          $toDate: "$createdAt", // Convert the timestamp to a Date object
        },

        commentCount: {
          $size: "$comments",
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
        views: {
          $size: "$viewers",
        },
      },
    },
    // projection
    {
      $project: {
        author: 1,
        isAuthor: 1,
        files: 1,
        followersCount: 1,
        isFollowing: 1,
        videoId: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        durations: 1,
        comments: 1,
        commentCount: 1,
        likeCount: 1,
        isLiked: 1,
        likes: 1,
        isFree: 1,
        views: 1,
        viewers: 1,
        uploadedDate: 1,
      },
    },
  ]);
  if (video?.course_id) {
    const courseData = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(video?.course_id),
        },
      },

      // Free videos
      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "course_id",
          as: "freeChapters",
          pipeline: [
            {
              $match: {
                $and: [{ isFree: false }, { isPublished: true }],
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "author",
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
            // getting views
            {
              $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "video_Id",
                as: "viewers",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "user_Id",
                      foreignField: "_id",
                      as: "userData",
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
                      viewer: {
                        $arrayElemAt: ["$viewer", 0],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      viewer: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                channelName: {
                  $arrayElemAt: ["$author.name", 0],
                },
                views: {
                  $size: "$viewers",
                },
                uploadedDate: {
                  $toDate: "$createdAt", // Convert the timestamp to a Date object
                },
              },
            },
            {
              $project: {
                _id: 1,
                videoId: 1,
                isFree: 1,
                title: 1,
                isPublished: 1,
                thumbnail: 1,
                channelName: 1,
                views: 1,
                uploadedDate: 1,
              },
            },
          ],
        },
      },
      // all videos
      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "course_id",
          as: "chapters",
          pipeline: [
            {
              $match: {
                isPublished: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "author",
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
            // getting views
            {
              $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "video_Id",
                as: "viewers",
                pipeline: [
                  {
                    $lookup: {
                      from: "users",
                      localField: "user_Id",
                      foreignField: "_id",
                      as: "userData",
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
                      viewer: {
                        $arrayElemAt: ["$viewer", 0],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 1,
                      viewer: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                channelName: {
                  $arrayElemAt: ["$author.name", 0],
                },
                views: {
                  $size: "$viewers",
                },
                uploadedDate: {
                  $toDate: "$createdAt", // Convert the timestamp to a Date object
                },
              },
            },
            {
              $project: {
                _id: 1,
                videoId: 1,
                isFree: 1,
                title: 1,
                isPublished: 1,
                thumbnail: 1,
                channelName: 1,
                views: 1,
                uploadedDate: 1,
              },
            },
          ],
        },
      },

      // getting enrolled student
      {
        $lookup: {
          from: "enrolleds",
          localField: "_id",
          foreignField: "course_Id",
          as: "enrolledStudent",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user_Id",
                foreignField: "_id",
                as: "studentData",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                studentData: {
                  $arrayElemAt: ["$studentData", 0],
                },
              },
            },
            {
              $project: {
                studentData: 1,
                isEnrolled: 1,
              },
            },
          ],
        },
      },
      // adding fields
      {
        $addFields: {
          enrolledStudentCount: {
            $size: "$enrolledStudent",
          },
          isEnrolled: {
            $cond: {
              if: { $in: [req.user?._id, "$enrolledStudent.studentData._id"] },
              then: true,
              else: false,
            },
          },
          chapters: {
            $filter: {
              input: "$chapters",
              as: "chapter",
              cond: {
                $or: [
                  { $eq: [req.user?._id, "$author._id"] },
                  { $eq: ["$$chapter.isFree", true] },
                  { $in: [req.user?._id, "$enrolledStudent.studentData._id"] },
                ],
              },
            },
          },
        },
      },

      // projection
      {
        $project: {
          isEnrolled: 1,
          freeChapters: 1,
          chapters: 1,
        },
      },
    ]);

    if (
      !videoData[0].isFree &&
      !videoData[0].isAuthor &&
      !courseData[0].isEnrolled
    ) {
      return res
        .status(403)
        .json(new ApiResponse(403, null, "Unauthorized to access this video"));
    }
    videoData[0].relatedVideo = courseData[0].chapters;
  }
  const recomended = await getRecommendedVideos(
    req,
    videoData[0].title,
    videoData[0].description
  );
  videoData[0].relatedVideo?.length
    ? (videoData[0].relatedVideo = [
        ...videoData[0].relatedVideo,
        ...recomended,
      ])
    : (videoData[0].relatedVideo = recomended);

  console.log('sending response');

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoData[0], "Video all deta fetched successfully")
    );
});

// Initialize the TF-IDF vectorizer

// Function to compute similarity scores between items
const computeCosineSimilarity = (doc1, doc2) => {
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(doc1);
  tfidf.addDocument(doc2);

  const terms1 = tfidf.listTerms(0);
  const terms2 = tfidf.listTerms(1);

  const dotProduct = terms1.reduce((sum, term1) => {
    const term2 = terms2.find((term) => term.term === term1.term);
    return term2 ? sum + term1.tfidf * term2.tfidf : sum;
  }, 0);

  const magnitude1 = Math.sqrt(
    terms1.reduce((sum, term) => sum + term.tfidf ** 2, 0)
  );
  const magnitude2 = Math.sqrt(
    terms2.reduce((sum, term) => sum + term.tfidf ** 2, 0)
  );

  return dotProduct / (magnitude1 * magnitude2);
};

// Function to get recommended content based on user interactions


const getRecommendedVideos = async (req, title, description) => {
  try {
    const userId = req?.user?._id;

    // Fetch user interactions (views, likes, etc.)
    const userViews = await View.find({ user_Id: userId }).populate(
      "video_Id post_Id course_Id"
    );

    // Extract titles and descriptions of user-interacted content (videos, posts, courses)
    const viewedContent = userViews.map((view) => ({
      type: view.video_Id ? "video" : view.post_Id ? "post" : "course",
      title: view.video_Id
        ? view.video_Id?.title
        : view.post_Id
        ? view.post_Id?.title
        : view.course_Id?.title,
      description: view.video_Id
        ? view.video_Id?.description
        : view.post_Id
        ? view.post_Id?.description
        : view.course_Id?.description,
    }));

    // Fetch all videos to compare against for recommendations
    const videos = await Video.find({ isPublished: true, isFree: true });

    // Create an array to hold similarity scores for recommendations
    const recommendations = videos.map((content) => {
      let similarityScore = 0;

      viewedContent.forEach((viewed) => {
        const contentText = content?.title + " " + content?.description;
        const viewedText = viewed?.title + " " + viewed?.description;
        const videoText = title + " " + description;
        similarityScore += computeCosineSimilarity(contentText, videoText); // Assuming this function is defined
      });

      return {
        contentId: content._id,
        title: content?.title,
        description: content?.description,
        type: content?.videoId
          ? "video"
          : content?.language
          ? "course"
          : "post",
        similarityScore,
      };
    });

    // Sort recommendations by similarity score and limit to top 12
    const sortedRecommendations = recommendations
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 12);

    const recomendedRecommendations = sortedRecommendations.map(
      (rec) => rec.contentId
    );
    // Now fetch the related video details from the database
    const recommendedVideos = await Video.aggregate([
      {
        $match: {
          _id: {
            $in: recomendedRecommendations,
          },
        },
      },
      // Lookup author details
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { _id: 1, username: 1, name: 1, avatar: 1 } }],
        },
      },
      // Lookup views and viewer details
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "video_Id",
          as: "viewers",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user_Id",
                foreignField: "_id",
                as: "viewer",
                pipeline: [
                  { $project: { _id: 1, username: 1, name: 1, avatar: 1 } },
                ],
              },
            },
            {
              $addFields: {
                viewer: { $arrayElemAt: ["$viewer", 0] },
              },
            },
            { $project: { _id: 1, viewer: 1 } },
          ],
        },
      },
      // Adding additional fields: author, views count, isFree flag
      {
        $addFields: {
          author: { $arrayElemAt: ["$author", 0] },
          views: { $size: "$viewers" },
          isFree: 1, // Add logic to dynamically set this if needed
          uploadedDate: {
            $toDate: "$createdAt", // Convert the timestamp to a Date object
          },
        },
      },
      // Final projection to shape the result
      {
        $project: {
          _id: 1,
          title: 1,
          videoId: 1,
          thumbnail: 1,
          uploadedDate: 1,
          channelName: "$author.name",
          views: 1,
          isFree: 1,
          authorAvatar: "$author.avatar",
        },
      },
    ]);

    // Return the recommended videos
    return recommendedVideos;
  } catch (error) {
    console.log("Error fetching recommendations:", error);
    return []; // Return an empty array in case of an error
  }
};



export {
  addVideo,
  getVideo,
  getAdminVideo,
  updateVideoId,
  updateTitle,
  updateDescription,
  updateThumbnail,
  updateVisibility,
  publishVideo,
  unpublishVideo,
  deleteVideo,
  addFile,
  deleteFile,
  getVideoData,
  getPlayingVideo,
};
