import { Router } from "express";
import { isAdmin, verifyJWT } from "../middelwares/auth.middelware.js";
import { approveCourse, createCategory, deleteCategory, deleteUser, getAdminDashboard, getAllApprovalCourse, getAllCategories, getAllUsers, getPendingCourses, toggleBlockUser, updateCategory, updateUserRole } from "../controllers/admin.controllers.js";


const router = Router()
// dashboard routes
router.route("/dashboard").get(verifyJWT, isAdmin, getAdminDashboard);
router.route("/pending-courses").get( verifyJWT, isAdmin, getPendingCourses);


// manage categories
router.route("/categories").post( verifyJWT, isAdmin, createCategory).get(getAllCategories).put(verifyJWT, isAdmin, updateCategory)
router.route("/categories/:_id").delete(verifyJWT, isAdmin,deleteCategory).put(verifyJWT, isAdmin, updateCategory)

// manage course approval status
router.route("/course/course-approval/:_id").patch(verifyJWT, isAdmin, approveCourse);
router.route("/course/course-get").get(verifyJWT, isAdmin, getAllApprovalCourse);


// manage user
router
  .route("/users")
  .get(verifyJWT, isAdmin, getAllUsers);

router
  .route("/users/block/:id")
  .patch(verifyJWT, isAdmin, toggleBlockUser);

router
  .route("/users/:id")
  .delete(verifyJWT, isAdmin, deleteUser)
  .patch(verifyJWT, isAdmin, updateUserRole);

export default router;