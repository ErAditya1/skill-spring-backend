import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  deleteCloudinaryFile,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const addBlogPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const featuredImagePath = req.file ? req.file.path : null;

  if (!title && !content && !featuredImagePath) {
    throw new ApiError(400, "All fields are required");
  }
  const img = await uploadOnCloudinary(featuredImagePath);
  if (!img) {
    throw new ApiError(400, "Image is not available");
  }
  console.log({ title, content, featuredImagePath });
  const blogPost = await Post.create({
    title,
    content,
    image: {
      public_id: img.public_id,
      url: img.secure_url,
    },
    author: req.user._id,
  });
  return res
    .status(201)
    .json(new ApiResponse(200, blogPost, "Post added successfully"));
});
const editBlogPost = asyncHandler(async (req, res) => {
  const { title, content,  previousImage } = req.body;
  const { _id } = req.params;

  const featuredImagePath = req.file ? req.file.path : null;

  if (
    !title &&
    !content &&
    !(featuredImagePath || deletedImage || previousImage)
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const img = await uploadOnCloudinary(featuredImagePath);
  if (!img && !(deletedImage || previousImage)) {
    throw new ApiError(400, "Image is not available");
  }
  console.log(img)

  await deleteCloudinaryFile(img?.public_id);

  const blogPost = await Post.findByIdAndUpdate(_id, {
    title,
    content,
    featuredImage: img ? img.public_id : previousImage,
    author: req.user.id,
  });
  return res
    .status(201)
    .json(new ApiResponse(200, blogPost, "Post updated successfully"));
});
const removeBlogPost = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(400, "Id is missing");
  }
  const { featuredImage } = req.body;
  await deleteCloudinaryFile(featuredImage);
  await Post.findByIdAndDelete(_id);
  return res
    .status(200)
    .json(new ApiResponse(200, "", "Post deleted successfully"));
});


const getAdminBlogPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({
    author: req.user.id,
  }).select("_id");
 
  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts is fetched successfully"));
});
const getAllBlogPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find().select("_id");
 
  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts is fetched successfully"));
});

const getBlogPostData = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  

  
  if (!_id) {
    throw new ApiError(400, "Id is missing");
  }
  try {
    const blogPost = await Post.aggregate([
      {
  
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      },
        //  lookup for post author
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
        // lookup for likes in post
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post_Id",
          as: "likes",
          
        },
      },
        // lookup for comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post_Id",
          as: "comments",
          
        },
      },
      // getting views
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "post_Id",
          as: "viewers",
          
        },
      },
  
        // add fields in post
      {
        $addFields: {
          likeCount: {
            $size: "$likes",
          },
          commentCount: {
            $size: "$comments",
          },
          author: {
            $arrayElemAt: ["$author", 0],
          },
          
          isLiked: {
            $cond: {
              if: { $in: [req.user?._id, "$likes.user_Id"] },
              then: true,
              else: false,
            },
          
          },
          views:{
            $size: "$viewers",
          },
          
          
        },
      },
        // Project of post data
      {
        $project: {
          _id: 1,
          image: 1,
          title: 1,
          author: 1,
          postDate: 1,
          isLiked: 1,
          likeCount: 1,
          commentCount:1,
          views: 1,
        },
      },
    ])
    
    return res
      .status(200)
      .json(new ApiResponse(200, blogPost[0], "Recevived all post data"));
  } catch (error) {
    console.log(error)
  }
});
const getBlogPostAllData = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  
 
  
  if (!_id) {
    throw new ApiError(400, "Id is missing");
  }
  try {
    const blogPost = await Post.aggregate([
      {
  
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      },
        //  lookup for post author
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
        // lookup for likes in post
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post_Id",
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
        // lookup for comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post_Id",
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
              $lookup:{
                from: "comments",
                localField: "_id",
                foreignField: "comment_Id",
                as: "commentsReply",
              
                pipeline:[
                  // lookup for author of coments reply
                  {
                    $lookup:{
                      from: "users",
                      localField: "user_Id",
                      foreignField: "_id",
                      as: "author",
                      pipeline:[
                        {
                          $project: {
                            _id: 1,
                            username: 1,
                            name: 1,
                            avatar: 1,
                          },
                        },
                      ],
                    }
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
                      isAuthor:{
                        $cond:{
                          if: { $in: [req.user?._id, "$author._id"]},
                          then: true,
                          else: false,
                        }
                      },
                     
                      likeCount: {
                        $size: "$likes"
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
                      isAuthor:1,
                      createdAt:1,
                      likeCount:1,
                      isLiked:1,
                      likes:1,
                      comment:1,
                    },
                  },
                ]
              }
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
                isAuthor:{
                  $cond:{
                    if: { $in: [req.user?._id, "$author._id"]},
                    then: true,
                    else: false,
                  }
                },
                replyCount:{
                  $size: "$commentsReply"
                },
                likeCount: {
                  $size: "$likes"
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
                isAuthor:1,
                comment:1,
                createdAt:1,
                commentsReply: 1,
                replyCount:1,
                likeCount:1,
                isLiked:1,
                likes:1,
  
  
              },
            }
          ],
        },
      },
      // getting views
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "post_Id",
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
                _id:1,
                viewer:1,
              }
            }
          ],
        },
      },
  
        // add fields in post
      {
        $addFields: {
          likeCount: {
            $size: "$likes",
          },
          commentCount: {
            $size: "$comments",
          },
          author: {
            $arrayElemAt: ["$author", 0],
          },
          isAuthor:{
            $cond:{
              if: { $in: [req.user?._id, "$author._id"]},
              then: true,
              else: false,
            }
          },
          isLiked: {
            $cond: {
              if: { $in: [req.user?._id, "$likes.user_Id"] },
              then: true,
              else: false,
            },
          
          },
          views:{
            $size: "$viewers",
          },
          
          
        },
      },
        // Project of post data
      {
        $project: {
          _id: 1,
          image: 1,
          title: 1,
          author: 1,
          isAuthor:1,
          postDate: 1,
          content: 1,
          likes: 1,
          comments: 1,
          author: 1,
          isLiked: 1,
          likeCount: 1,
          commentCount:1,
          views: 1,
          viewers: 1,
        },
      },
    ])
    
    return res
      .status(200)
      .json(new ApiResponse(200, blogPost, "Recevived all post data"));
  } catch (error) {
    console.log(error)
  }
});

export {
  addBlogPost,
  editBlogPost,
  removeBlogPost,
  getAdminBlogPosts,
  getAllBlogPosts,
  getBlogPostData,
  getBlogPostAllData,
};
