import { Router } from "express";
import { upload } from "../middelwares/multer.middelware.js";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import {
  addBlogPost,
  editBlogPost,
  getAdminBlogPosts,
  getAllBlogPosts,
  getBlogPostAllData,
  getBlogPostData,
  removeBlogPost,
} from "../controllers/post.controller.js";
import { postViews } from "../controllers/view.controller.js";

const router = new Router();
router
  .route("/add")
  .post(verifyJWT, upload.single("image"), addBlogPost);
router
  .route("/edit/:_id")
  .patch(
    verifyJWT,
    upload.single("image"),
    editBlogPost,
    getBlogPostData
  );
router.route("/remove/:_id").delete(verifyJWT, removeBlogPost, getBlogPostData);
router.route("/get-admin-posts").get(verifyJWT, getAdminBlogPosts)
router.route("/get").get(getAllBlogPosts);
router.route("/get-data/:_id").get(verifyJWT, getBlogPostData);
router.route("/get-all-data/:_id").get(verifyJWT, postViews, getBlogPostAllData);

export default router;
