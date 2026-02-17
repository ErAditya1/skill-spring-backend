import { Course } from "../models/course.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { View } from "../models/view.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

import natural from "natural";

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

const getRecommendedContent = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?._id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 12;
    const skip = (page - 1) * pageSize;

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
      description: view?.video_Id
        ? view?.video_Id?.description
        : view?.post_Id
        ? view?.post_Id?.description
        : view?.course_Id?.description,
    }));

    // Fetch all posts, videos, and courses to compare against
    const videos = await Video.find({ isPublished: true, isFree: true });
    const posts = await Post.find({});
    const courses = await Course.find({ isPublished: true });

    const allContent = [...videos, ...posts, ...courses];

    // Create an array to hold similarity scores for recommendations
    const recommendations = allContent.map((content) => {
      let similarityScore = 0;

      viewedContent.forEach((viewed) => {
        const contentText = content?.title + " " + content?.description;
        const viewedText = viewed?.title + " " + viewed?.description;
        similarityScore += computeCosineSimilarity(contentText, viewedText);
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

    // Sort recommendations by similarity score
    recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

    // Paginate recommendations
    const paginatedRecommendations = recommendations.slice(
      skip,
      skip + pageSize
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          paginatedRecommendations,
          "Recommended content fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(500).json({ message: "Error fetching recommendations" });
  }
});

const searchContent = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  if (!query) {
    throw new ApiError(404, "Not a valid query");
  }
cd 
  const userSearch = User.find({
    $or: [
      { username: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    

  const courseSearch = Course.find({
    $or: [
      { orderNumber: { $regex: query, $options: "i" } },
      { status: { $regex: query, $options: "i" } },
    ],
    isPublished:true,
  })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const videoSearch = Video.find({
    $or: [
      { orderNumber: { $regex: query, $options: "i" } },
      { status: { $regex: query, $options: "i" } },
    ],
    isPublished: true,
  })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const postSearch = Post.find({
    $or: [
      { orderNumber: { $regex: query, $options: "i" } },
      { status: { $regex: query, $options: "i" } },
    ],
  })
    .skip((page - 1) * limit)
    .limit(Number(limit));



  // Use Promise.all to run queries concurrently
  const [users, course, video, post] = await Promise.all([userSearch, courseSearch, videoSearch, postSearch]);
  const combinedResults = {
    users,
    course,
    video,
    post
  };

  const result = combinedResults.map((result) => {
    if(result?.username) return{contentId : result._id,type:"user"}
    else if(result?.language) return{contentId : result?._id, type: 'course'}
    else if(result?.videoId) return{contentId : result?._id, type: 'video'}
    else return{contentId : result?._id, type: 'post'}
  })


  res.status(200).json(new ApiResponse(200, result, "Serach Successfully"));
});

export { 
    getRecommendedContent ,
    searchContent
};
