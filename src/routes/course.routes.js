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
  getCourseDataPublic,
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
  updateCourseCategory,
  submitForReview,
   markVideoCompleted,
  updateLastWatched,
  getMyCourses,
  generateCertificate,
  getAnalytics,
  getCourseReviews,
  addOrUpdateReview,
  getTeacherCourses,
  getAllPublicCourses,
} from "../controllers/course.controller.js";
import { upload } from "../middelwares/multer.middelware.js";
import { courseViews } from "../controllers/view.controller.js";

const router = new Router();






  
  router
  .route("/course/review/:courseId")
  .post(verifyJWT, addOrUpdateReview)
  .get(getCourseReviews);
router.route("/course/getAllPublicCourses").get(getAllPublicCourses);

router.route("/course/getPublishedCourses/:_id").get(getPublishedCoursesData);
router.route("/course/get-course-public-data/:_id").get(getCourseDataPublic);  

router.use(verifyJWT);



/* ================= ENROLLMENT FEATURES ================= */

// Mark video completed
router
  .route("/course/complete-video")
  .post(markVideoCompleted);

// Update last watched video
router
  .route("/course/update-last-watched")
  .post(updateLastWatched);

// Get my enrolled courses
router
  .route("/my-courses/my-courses")
  .get( getMyCourses);

// Download certificate
router
  .route("/course/certificate/:courseId")
  .get( generateCertificate);

// Learning analytics
router
  .route("/course/analytics")
  .get( getAnalytics);



  


router.route("/course/updateTitle/:_id").patch(updateTitle);
router.route("/course/updateDescription/:_id").patch(updateDescription);
router.route("/course/updateLanguage/:_id").patch(updateLanguage);
router.route("/course/updatePrice/:_id").patch(updateActualPrice);
router.route("/course/updateCategory/:_id").patch(updateCourseCategory);
router
  .route("/course/updateThumbnail/:_id")
  .patch(upload.single("thumbnail"), updateThumbnail);
router.route("/course/updateDuration/:_id").patch(updateDuration);
router.route("/course/publish/:_id").patch(publishCourse);
router.route("/course/submit-for-review/:_id").patch(submitForReview  );

router.route("/course/addChapter/:_id").post(addChapter, getCourseData);

router.route("/course/reorder-chapters/:_id").put(reorderChapters);

router.route("/course/get-course-data/:_id").get(courseViews, getCourseData);                 
               
router.route("/course/get-edit-course-data/:_id").get(getEditCourseData);
router.get(
  "/teacher/getTeacherCourses",
  verifyJWT,
  getTeacherCourses
);


router.route("/course/getAllCourses").patch(getAllCourses);
router.route("/course/getAdminCourses").patch(getAdminCourses);

router.route("/course/getEnrolledCourses").patch(getEnrolledCourses);

router.route("/get-course-explore/:_id").get(courseViews, getCourseData);

router.route("/course/publish/:_id").patch(publishCourse);
router.route("/course/order-summary/:_id").get(orderSummary);

router.route("/course").post(addCourse);


router.route("/course/:_id").post(addCourse).get(getData).delete(removeCourse);


export default router;
