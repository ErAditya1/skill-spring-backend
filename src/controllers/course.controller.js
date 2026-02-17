import mongoose from "mongoose";
import { Course } from "../models/course.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  deleteCloudinaryFile,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { Chat } from "../models/chat.model.js";
import { Enrolled } from "../models/enrolled.model.js";
import { getVideoInfo } from "./video.controller.js";

const addCourse = asyncHandler(async (req, res) => {
  const author = req.user._id;
  const { title } = req.body;

  if (!author) throw new ApiError(404, "Author Id is required");
  if (!title) throw new ApiError(404, "Title is required");

  const course = await Course.create({
    author,
    title,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course added successfully"));
});

const updateCourse = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const {
    public_id,
    secure_url,
    title,
    description,
    language,
    isPublished,
    actualPrice,
    discountPrice,
    startOn,
    endOn,
  } = req.body;

  if (
    [
      title,
      description,
      language,
      isPublished,
      actualPrice,
      discountPrice,
      startOn,
      endOn,
    ].some((val) => {
      val.trim() === "";
    })
  ) {
    throw new ApiError(404, "All fields are required");
  }
  const discount = Math.floor(
    ((actualPrice - discountPrice) / actualPrice) * 100 || 0,
  );

  const thumbnailFilePath = req.file?.path;
  let thumbnailFile;
  if (thumbnailFilePath) {
    thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);
  }
  if (thumbnailFile) {
    await deleteCloudinaryFile(public_id);
  }

  const course = await Course.findByIdAndUpdate(_id, {
    author: req.user._id,
    thumbnail: {
      public_id: thumbnailFile ? thumbnailFile?.public_id : public_id,
      secure_url: thumbnailFile ? thumbnailFile?.secure_url : secure_url,
    },
    title,
    description,
    language,
    isPublished,
    actualPrice,
    discountPrice,
    discount,
    startOn,
    endOn,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course is updated successfully"));
});

const updateTitle = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { title } = req.body;
  if (!_id || !title) {
    throw new ApiError(404, "Course Id and Title are required");
  }
  const course = await Course.findByIdAndUpdate(_id, {
    $set: {
      title,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course title is updated successfully"));
});

const updateDescription = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { description } = req.body;
  if (!_id || !description) {
    throw new ApiError(404, "Course Id and Description are required");
  }
  const course = await Course.findByIdAndUpdate(_id, {
    $set: {
      description,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        course,
        "Course description is updated successfully",
      ),
    );
});

const updateLanguage = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { language } = req.body;
  if (!_id || !language) {
    throw new ApiError(404, "Course Id and Language are required");
  }
  const course = await Course.findByIdAndUpdate(_id, {
    $set: {
      language,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, course, "Course language is updated successfully"),
    );
});

const updateActualPrice = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { printPrice, discount } = req.body;
  if (!_id || !(printPrice >= 0) || !(discount >= 0)) {
    throw new ApiError(404, "Course Id and Print Price are required");
  }
  const sellingPrice = Math.floor(printPrice - (printPrice * discount) / 100);
  const course = await Course.findByIdAndUpdate(_id, {
    $set: {
      printPrice,
      discount,
      sellingPrice,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        course,
        "Course actual price is updated successfully",
      ),
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

  if (!thumbnailFile) throw new ApiError(500, "Thumbnail Upload faild ");

  const course = await Course.findById(_id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Delete old thumbnail from cloudinary

  if (course.thumbnail) {
    await deleteCloudinaryFile(course.thumbnail.public_id);
  }

  course.thumbnail.public_id = thumbnailFile?.public_id;
  course.thumbnail.secure_url = thumbnailFile?.secure_url;

  const newCourse = await course.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newCourse,
        "Course thumbnail is updated successfully",
      ),
    );
});

const updateDuration = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { from, to } = req.body;
  if (!_id || !from || !to) {
    throw new ApiError(404, "Course Id  and Duration are required ");
  }
  const course = await Course.findByIdAndUpdate(_id, {
    $set: {
      from,
      to,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, course, "Course duration is updated successfully"),
    );
});

// PATCH /v1/courses/course/update-category/:course_id

export const updateCourseCategory = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { category } = req.body;

  const updatedCourse = await Course.findByIdAndUpdate(
    _id,
    { category },
    { new: true },
  ).populate("category");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedCourse,
        "Course category updated successfully",
      ),
    );
});

export const submitForReview = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const course = await Course.findById(_id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  if (course.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  course.status = "pending";
  await course.save();

  return res.status(200).json(
    new ApiResponse(200, course, "Course submitted for review")
  );
});




const publishCourse = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Course Id is required");
  }
  const validatedCourse = await Course.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "course_id",
        as: "chapters",
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "course_id",
        as: "publishedChapters",
        pipeline: [
          {
            $match: {
              isPublished: true,
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
            $project: {
              videos: 1,
            },
          },
        ],
      },
    },

    {
      $project: {
        _id: 1,
        title: 1,
        category: 1,
        description: 1,
        language: 1,
        isPublished: 1,
        printPrice: 1,
        sellingPrice: 1,
        discount: 1,
        thumbnail: 1,
        chapters: 1,
        publishedChapters: 1,
      },
    },
  ]);
  // console.log(validatedCourse[0])
  if (!validatedCourse[0]?.title || !validatedCourse[0]?.description) {
    throw new ApiError(404, "All fields are required");
  }
  if (!validatedCourse[0]?.thumbnail?.secure_url) {
    throw new ApiError(404, "Thumbnail is required");
  }
  if (!validatedCourse[0]?.language) {
    throw new ApiError(404, "Language is required");
  }
  if (!validatedCourse[0]?.category) {
    throw new ApiError(404, "Category is required");
  }
  if (
    validatedCourse[0]?.discount <= -1 ||
    validatedCourse[0]?.discount > 100
  ) {
    throw new ApiError(404, "Discount should be between 0 and 100");
  }
  if (validatedCourse[0]?.sellingPrice > validatedCourse[0]?.printPrice) {
    throw new ApiError(404, "Selling price should be less than print price");
  }

  if (!validatedCourse[0]?.chapters) {
    throw new ApiError(404, "Please add at least one chapter should be add");
  }
  if (!validatedCourse[0]?.publishedChapters?.length) {
    throw new ApiError(
      404,
      "Please publish at least one chapter should be add",
    );
  }

  const course = await Course.findById(_id);
  if (course.isPublished) {
    await Chat.findOneAndDelete({
      course_Id: course._id,
      isGroupChat: true,
      admin: req.user._id,
    });
    course.isPublished = false;
    await course.save();
    return res
      .status(200)
      .json(
        new ApiResponse(200, course, "Course is Un published successfully"),
      );
  }
  course.isPublished = true;

  const inrolleds = await Enrolled.find({
    course_Id: course._id,
  });
  const members = inrolleds.map((member) => {
    return member.user_Id.toString();
  });
  members.push(req.user._id.toString());

  const groupChat = await Chat.findOne({
    course_Id: course._id,
    isGroupChat: true,
    admin: req.user._id,
  });

  if (!groupChat && members.length > 0) {
    await Chat.create({
      name: course.title,
      isGroupChat: true,
      participants: members,
      admin: req.user._id,
      course_Id: course._id,
      avatar: {
        public_id: course.thumbnail.public_id,
        url: course.thumbnail?.secure_url,
      },
    });
  }

  await course.save();

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course is published successfully"));
});

const removeCourse = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Course Id is required");
  }
  const course = await Course.findById(_id);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  if (course?.thumbnail?.public_id) {
    deleteCloudinaryFile(course?.thumbnail?.public_id);
  }
  const courseStatus = await Course.findByIdAndDelete(_id);
  return res
    .status(200)
    .json(new ApiResponse(200, courseStatus, "Course is removed successfully"));
});

const getData = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Course Id is required");
  }

  const course = await Course.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },

    /* ---------------- CATEGORY LOOKUP ---------------- */
    {
      $lookup: {
        from: "categories", // correct collection name
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------------- CHAPTERS UNWIND ---------------- */
    {
      $unwind: {
        path: "$chapters",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------------- VIDEO LOOKUP ---------------- */
    {
      $lookup: {
        from: "videos",
        localField: "chapters",
        foreignField: "_id",
        as: "videoItem",
      },
    },
    {
      $unwind: {
        path: "$videoItem",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------------- MERGE VIDEO DATA ---------------- */
    {
      $addFields: {
        "chapters._id": "$videoItem._id",
        "chapters.title": "$videoItem.title",
        "chapters.isPublished": "$videoItem.isPublished",
        "chapters.isFree": "$videoItem.isFree",
      },
    },

    /* ---------------- GROUP BACK ---------------- */
    {
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        description: { $first: "$description" },
        thumbnail: { $first: "$thumbnail" },
        language: { $first: "$language" },
        category: { $first: "$category" },
        printPrice: { $first: "$printPrice" },
        discount: { $first: "$discount" },
        sellingPrice: { $first: "$sellingPrice" },
        from: { $first: "$from" },
        to: { $first: "$to" },
        chapters: { $push: "$chapters" },
      },
    },
  ]);

  if (!course.length) {
    throw new ApiError(404, "Course not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, course[0], "Course fetched successfully"));
});

const getEnrolledCourses = asyncHandler(async (req, res) => {
  const course = await Enrolled.find({ user_Id: req.user._id }).select(
    "course_Id",
  );

  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course is fetched successfully"));
});

const getAllCourses = asyncHandler(async (req, res) => {
  const course = await Course.find({ isPublished: true }).select("_id");

  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course is fetched successfully"));
});





const getAdminCourses = asyncHandler(async (req, res) => {
  // const count = await Course.countDocuments(query);

  const course = await Course.find({ author: req.user });

  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course is fetched successfully"));
});

const getPublishedCoursesData = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  try {
    const courseData = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
          isPublished: true,
        },
      },

      // Getting author of the course
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
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

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
              $project: {
                _id: 1,
                isFree: 1,
                title: 1,
                isPublished: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "enrolleds",
          localField: "_id",
          foreignField: "course_Id",
          as: "enrolledStudents",
          pipeline: [
            {
              $match: {
                user_Id: req.user?._id,
              },
            },
            {
              $project: {
                _id: 1,
                user_Id: 1,
                course_Id: 1,
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
          chapterCount: {
            $size: "$chapters",
          },
          isFree: {
            $cond: {
              if: { $eq: ["$printPrice", 0] },
              then: true,
              else: false,
            },
          },
          isEnrolled: {
            $cond: {
              if: { $size: ["$enrolledStudents"] },
              then: true,
              else: false,
            },
          },
        },
      },
      // projection
      {
        $project: {
          author: 1,
          isAuthor: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          thumbnail: 1,
          title: 1,
          description: 1,
          language: 1,
          isPublished: 1,
          printPrice: 1,
          sellingPrice: 1,
          discount: 1,
          chapterCount: 1,
          isFree: 1,
          isEnrolled: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          courseData,
          "Course all deta fetched successfully",
        ),
      );
  } catch (error) {
    console.log(error);
  }
});

const getCourseData = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Course Id is required");
  }
  try {
    const courseData = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
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
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true,
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
                $and: [{ isFree: true }, { isPublished: true }],
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
                author: {
                  $arrayElemAt: ["$author", 0],
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
                author: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "quizzes", // Convert
          localField: "_id",
          foreignField: "course_Id",
          as: "quizzes",
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
            {
              $lookup: {
                from: "quizattempts",
                localField: "_id",
                foreignField: "quiz_Id",
                as: "attempts",
              },
            },
            {
              $addFields: {
                channelName: {
                  $arrayElemAt: ["$author.name", 0],
                },
                author: {
                  $arrayElemAt: ["$author", 0],
                },
                views: {
                  $size: "$attempts",
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
                author: 1,
              },
            },
          ],
        },
      },
      // Getting author of the course
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
                      username: 1,
                      name: 1,
                      avatar: 1,
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
              },
            },
          ],
        },
      },
      // getting feedback about courses
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "course_Id",
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
          foreignField: "course_Id",
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
          foreignField: "course_Id",
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
      // getting chat id of this course
      {
        $lookup: {
          from: "chats",
          localField: "_id",
          foreignField: "course_Id",
          as: "chats",
          pipeline: [
            {
              $project: {
                _id: 1,
                chatId: 1,
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
          chapters: {
            $filter: {
              input: "$chapters",
              as: "chapter",
              cond: {
                $or: [
                  { $eq: [req.user?._id, "$$chapter.author._id"] },
                  { $eq: ["$$chapter.isFree", true] },
                  { $in: [req.user?._id, "$enrolledStudent.studentData._id"] },
                ],
              },
            },
          },
          quizzes: {
            $filter: {
              input: "$quizzes",
              as: "quiz",
              cond: {
                $or: [
                  { $eq: [req.user?._id, "$$quiz.author"] },
                  { $eq: ["$$quiz.isFree", true] },
                  { $in: [req.user?._id, "$enrolledStudent.studentData._id"] },
                ],
              },
            },
          },
          chat: {
            $arrayElemAt: ["$chats", 0],
          },
        },
      },
      // projection
      {
        $project: {
          author: 1,
          isAuthor: 1,
          followersCount: 1,
          isFollowing: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          language: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          from: 1,
          to: 1,
          isPublished: 1,
          printPrice: 1,
          sellingPrice: 1,
          discount: 1,
          enrolledStudentCount: 1,
          enrolledStudent: 1,
          isEnrolled: 1,
          comments: 1,
          commentCount: 1,
          likeCount: 1,
          isLiked: 1,
          likes: 1,
          views: 1,
          viewers: 1,
          chapters: 1,
          quizzes: 1,
          chat: 1,
        },
      },
    ]);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          courseData[0],
          "Course all deta fetched successfully",
        ),
      );
  } catch (error) {
    console.log(error);
  }
});

const getEditCourseData = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Course Id is required");
  }
  try {
    const courseData = await Course.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
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
                isFree: true,
              },
            },
            {
              $addFields: {},
            },
            {
              $project: {
                _id: 1,
                isFree: 1,
              },
            },
          ],
        },
      },
      // all videos
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "course_id",
          as: "chapters",
          pipeline: [
            {
              $addFields: {},
            },
            {
              $project: {
                _id: 1,
                isFree: 1,
                title: 1,
                isPublished: 1,
              },
            },
          ],
        },
      },
      //get all quizzes
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "course_Id",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          isAuthor: {
            $cond: {
              if: { $eq: ["$author", req.user?._id] },
              then: true,
              else: false,
            },
          },
        },
      },

      // projection
      {
        $project: {
          author: 1,
          isAuthor: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          language: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          from: 1,
          to: 1,
          isPublished: 1,
          printPrice: 1,
          sellingPrice: 1,
          discount: 1,
          freeChapters: 1,
          chapters: 1,
          quizzes: 1,
          status:1,
        },
      },
    ]);
    // if(courseData?.author !== req.user._id){
    //   throw new ApiError(403, "You are not authorized to view this course");
    // }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          courseData,
          "Course all deta fetched successfully",
        ),
      );
  } catch (error) {
    console.log(error);
  }
});

const orderSummary = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Course not found");
  }
  const order = await Course.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    // Getting author of the course
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
              name: 1,
              email: 1,
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
              isEnrolled: {
                $cond: {
                  if: { $in: [req.user?._id, "$studentData._id"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              studentData: 1,
              isEnrolled: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isEnrolled: {
          $cond: {
            if: { $in: [req.user?._id, "$enrolledStudent.studentData._id"] },
            then: true,
            else: false,
          },
        },
        author: {
          $arrayElemAt: ["$author", 0],
        },
        isAuther: {
          $cond: {
            if: { $in: [req.user?._id, "$author._id"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        author: 1,
        isAuthor: 1,
        thumbnail: 1,
        title: 1,
        printPrice: 1,
        sellingPrice: 1,
        discount: 1,
        enrolledStudent: 1,
        isEnrolled: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, order[0], "Course all deta fetched successfully"),
    );
});

const getFreeVideos = asyncHandler(async () => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(404, "Course not found");
  }
  const videos = await Course.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "course_id",
        as: "videos",
        pipeline: [
          {
            $match: {
              $and: [{ isFree: true }, { isPublished: true }],
            },
          },

          {
            $project: {
              _id: 1,
              isFree: 1,
            },
          },
        ],
      },
    },
  ]);
  return res.status(200).json(new ApiResponse(200, videos, "Data fetched"));
});

const addChapter = asyncHandler(async (req, res, next) => {
  const { title, description, videoUrl } = req.body;
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(404, "Course ID is required");
  }
  if (!title || !description || !videoUrl) {
    throw new ApiError(404, "All fields are required");
  }

  const { videoId, videoType } = getVideoInfo(videoUrl);

  const isVideo = await Video.findOne({
    videoId,
  });
  if (isVideo) {
    throw new ApiError(404, "Video with the given ID already exists");
  }

  const video = await Video.create({
    title,
    description,
    videoId,
    videoType,
    course_id: _id,
    author: req.user._id,
  });
  if (!video) {
    throw new ApiError(500, "Failed to create video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Chapter added successfully"));
});

const reorderChapters = asyncHandler(async (req, res) => {
  const { updateData } = req.body;
  const { _id } = req.params;

  if (!_id || !updateData) {
    throw new ApiError(404, "Course ID and chapters are required");
  }

  const course = await Course.findByIdAndUpdate(
    _id,
    { updateData },
    { new: true },
  );

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Chapters reordered successfully"));
});

export {
  addCourse,
  updateCourse,
  updateTitle,
  updateDescription,
  getEnrolledCourses,
  updateLanguage,
  updateActualPrice,
  updateThumbnail,
  updateDuration,
  publishCourse,
  removeCourse,
  getData,
  getAllCourses,
  
  getPublishedCoursesData,
  getAdminCourses,
  getCourseData,
  getEditCourseData,
  orderSummary,
  getFreeVideos,
  addChapter,
  reorderChapters,
};
