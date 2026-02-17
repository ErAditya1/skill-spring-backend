import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { createPayment, enrollCourse, validatePayment } from "../PaymentHandler/payment.controller.js";


const router = new Router();
router.use(verifyJWT)
router.route("/create-order").post( createPayment)
router.route("/verify/enroll/:course_Id").post(validatePayment, enrollCourse)
router.route("/enroll-course/:course_Id").post(enrollCourse)
export default router;
