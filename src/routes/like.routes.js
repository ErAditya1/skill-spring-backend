import {Router} from 'express'
import { likeComment, likeCourse, likePost, likeVideo } from '../controllers/like.controller.js'
import {verifyJWT} from '../middelwares/auth.middelware.js'

const router = Router()

router.use(verifyJWT)

router.route('/post/:post_Id').post(likePost)
router.route("/video/:video_Id").post(likeVideo)
router.route("/comment/:comment_Id").post(likeComment)
router.route("/course/:course_Id").post(likeCourse)


export default router
