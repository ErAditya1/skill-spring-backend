import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import {
  addVideo,
  addFile,
  deleteFile,
  deleteVideo,
  getAdminVideo,
  getPlayingVideo,
  getVideo,
  getVideoData,
  publishVideo,
  unpublishVideo,
  updateDescription,
  updateThumbnail,
  updateTitle,
  updateVideoId,
  updateVisibility,
} from "../controllers/video.controller.js";
import { upload } from "../middelwares/multer.middelware.js";
import { videoViews } from "../controllers/view.controller.js";

const router = Router();

router.use(verifyJWT);
router.route("/post").post(upload.single("thumbnail"),addVideo)
router.route("/video/get-chapter/:_id").get(getVideo);
router.route("/video/get-admin-videos").get(getAdminVideo);

router.route("/video/update-videoId/:_id").patch(updateVideoId);

router.route("/video/update-title/:_id").patch(updateTitle);

router.route("/video/update-description/:_id").patch(updateDescription);

router
  .route("/video/update-thumbnail/:_id")
  .patch(upload.single("thumbnail"), updateThumbnail);

router.route("/video/update-videoPublish/:_id").patch(publishVideo);
router.route("/video/update-videoUnPublish/:_id").patch(unpublishVideo);

router.route("/video/get-video-data/:_id").get(videoViews, getPlayingVideo);
router.route("/video/get-video/:_id").get(getVideoData);

router.route("/video/delete-chapter/:_id").delete(deleteVideo);

router.route("/video/update-visibility/:_id").patch(updateVisibility);
router
  .route("/video/file/:_id")
  .post(upload.single("file"), addFile)
  .delete(deleteFile);

export default router;
