import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { getRecommendedContent, searchContent } from "../controllers/comman.controller.js";


const router = Router();

router.use(verifyJWT);

router.route("/recomended").get(getRecommendedContent)
router.route("/search").get(searchContent)

export default router;
