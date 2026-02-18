import { Router } from "express";
import { getStudentDashboard } from "../controllers/student.controllers.js";
import { verifyJWT } from "../middelwares/auth.middelware.js";


const router = Router()

router.get("/dashboard", verifyJWT, getStudentDashboard);

export default router;
