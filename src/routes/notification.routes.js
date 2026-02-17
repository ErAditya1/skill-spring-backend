import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { getUserNotifications, markNotificationAsRead, saveSubscription } from "../controllers/notification.controller.js";


const router = Router();

router.use(verifyJWT);

router.route('/save-subscription').post(saveSubscription);
router.route('/clear-notification').post(markNotificationAsRead);

// Route to get notifications for a specific user
router.route('/get-notification/:userId').get(getUserNotifications);


export default router;