import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { addQuestion, attemptQuiz, deleteQuestion, deleteQuiz, getQuiz, getQuizQuestions, postQuiz, quizPublish, quizVisibility, submitQuizAttempt, updateDescription, updateThumbnail, updateTitle } from "../controllers/quiz.controllers.js";
import { upload } from "../middelwares/multer.middelware.js";
import { updateVisibility } from "../controllers/video.controller.js";




const router = Router();

router.use(verifyJWT)


router.route("/post/:_id").post(postQuiz)
router.route("/get/:_id").get(getQuiz)
router.route("/title/:_id").patch(updateTitle)
router.route("/description/:_id").patch(updateDescription)
router.route("/thumbnail/:_id",).patch(upload.single("thumbnail"),updateThumbnail)
router.route("/visibility/:_id").patch(quizVisibility)
router.route("/published/:_id").patch(quizPublish)
router.route("/delete/:_id").delete(deleteQuiz)
router.route("/add-question/:_id").post(addQuestion)
router.route("/delete-question/:_id").delete(deleteQuestion)
router.route("/questions/:_id").get(getQuizQuestions)
router.route("/submit/:_id").post(attemptQuiz)








export default router
