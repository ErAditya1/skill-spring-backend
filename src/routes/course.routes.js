import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import {
  addChapter,
  addCourse,
  getAdminCourses,
  getAllCourses,
  getCourseData,
  getData,
  getEditCourseData,
  getEnrolledCourses,
  getFreeVideos,
  getPublishedCoursesData,
  orderSummary,
  publishCourse,
  removeCourse,
  reorderChapters,
  updateActualPrice,
  updateCourse,
  updateDescription,
  updateDuration,
  updateLanguage,
  updateThumbnail,
  updateTitle,
} from "../controllers/course.controller.js";
import { upload } from "../middelwares/multer.middelware.js";
import { courseViews } from "../controllers/view.controller.js";

const router = new Router();

router.use(verifyJWT);
router.route("/course").post(addCourse);
router.route("/course/:_id").post(addCourse).get(getData).delete(removeCourse);

router.route("/course/updateTitle/:_id").patch(updateTitle);
router.route("/course/updateDescription/:_id").patch(updateDescription);
router.route("/course/updateLanguage/:_id").patch(updateLanguage);
router.route("/course/updatePrice/:_id").patch(updateActualPrice);
router
  .route("/course/updateThumbnail/:_id")
  .patch(upload.single("thumbnail"), updateThumbnail);
router.route("/course/updateDuration/:_id").patch(updateDuration);
router.route("/course/publish/:_id").patch(publishCourse);

router.route("/course/addChapter/:_id").post(addChapter, getCourseData);

router.route("/course/reorder-chapters/:_id").put(reorderChapters);

router.route("/course/get-course-data/:_id").get(courseViews, getCourseData);
router.route("/course/get-edit-course-data/:_id").get(getEditCourseData);

router.route("/course/getAllCourses").patch(getAllCourses);
router.route("/course/getAdminCourses").patch(getAdminCourses);
router.route("/course/getPublishedCourses/:_id").get(getPublishedCoursesData);
router.route("/course/getEnrolledCourses").patch(getEnrolledCourses);

router.route("/get-course-explore/:_id").get(courseViews, getCourseData);

router.route("/course/publish/:_id").patch(publishCourse);
router.route("/course/order-summary/:_id").get(orderSummary);
export default router;
