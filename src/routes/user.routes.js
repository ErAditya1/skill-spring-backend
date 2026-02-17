import { Router } from "express";
import { verifyJWT } from "../middelwares/auth.middelware.js";
import { upload } from "../middelwares/multer.middelware.js";
import passport from "passport";
import '../passport/index.js'

import {
  changeCurrentPassword,
  getCurrentUser,
  getUserProfile,
  getUserName,
  getWatchHistory,
  logOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserAccount,
  followToNewUser,
  getAllUsers,
  getUser,
  verifyCode,
  resendCode,
  registerWithSocial,
  requestResetPassword,
  resetPassword,
  getProfile,
  handleSocialLogin,
} from "../controllers/user.controller.js";

const router = Router();
router.route("/check-username").get(getUserName);
router.route("/register").post(registerUser);
router.route("/register-social").post(registerWithSocial);
router.route("/verify-code").post((req,res,next)=>{
  console.log("ksjndvjnxcjlk")
  return next()
},verifyCode).patch(resendCode);
router.route("/login").post(loginUser);

// Social Login


// SSO routes
router.route("/google").get(
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
  (req, res) => {
    res.send("redirecting to google...");
  }
);

router.route("/github").get(
  passport.authenticate("github", {
    scope: ["profile", "email"],
  }),
  (req, res) => {
    res.send("redirecting to github...");
  }
);

router
  .route("/google/callback")
  .get(passport.authenticate("google"), handleSocialLogin);

router
  .route("/github/callback")
  .get(passport.authenticate("github"), handleSocialLogin);



router.route("/get-all-users").get(verifyJWT, getAllUsers);

//secured routes
router.route("/logout").patch(verifyJWT, logOutUser);
router.route("/refresh-token").patch(refreshAccessToken);
router.route("/request-reset-password").post(requestResetPassword);
router.route("/reset-password").post(resetPassword);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/get-user/:_id").get(verifyJWT, getUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/get-user-profile/:username").get(verifyJWT, getUserProfile);
router.route("/get-user-profile").get(verifyJWT, getProfile);
router.route("/get-user-account/:_id").get(verifyJWT, getUserAccount);
router.route("/user-follow-handler/:following").post(verifyJWT, followToNewUser);

router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
