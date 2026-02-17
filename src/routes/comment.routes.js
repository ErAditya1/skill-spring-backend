import { Router } from "express";
import {
  addCommentReply,
  addCourseComment,
  addPostComment,
  addVideoComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { getBlogPostData } from "../controllers/post.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// router.route("/:video_Id").get(getVideoComments);

router.route("/post/:_id").post(addPostComment, getBlogPostData).patch().delete(deleteComment);
router.route("/video/:_id").post(addVideoComment).patch().delete(deleteComment);;
router.route("/reply/:_id").post(addCommentReply).patch().delete(deleteComment);
router.route("/course/:_id").post(addCourseComment).patch(updateComment).delete(deleteComment);

export default router;
