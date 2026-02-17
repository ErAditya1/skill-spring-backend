import {Router} from 'express'
import {verifyJWT} from '../middelwares/auth.middelware.js'
import { courseSave, postSave, videoSave } from '../controllers/save.controllers.js'

const router = Router()

router.use(verifyJWT)

router.route('/post/:_id').post(postSave)
router.route("/video/:_id").post(videoSave)
router.route("/course/:_id").post(courseSave)


export default router
