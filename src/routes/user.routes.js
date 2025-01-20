import Router from "express";
import registerUser, {
  refreshAccessToken,
  loginUser,
  logoutUser,
  emailResetPassword,
  mobileRegister,
  emailRegister,
  googleLogin,
  loginPhoneUser,
  getCurrentUser,
  handleProfileImage,
  updateAccountDetails,
  updatePassword,
  handleCoverImage,
} from "../controllers/user.controller.js";
import {
  verifyOTP,
  resendOTPCode,
  verifyMobileOTP,
  resendMobileOTP,
} from "../controllers/otp.controller.js";
import passport from "passport";
import verifyJWT from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(registerUser);

router
  .route("/auth/google")
  .get(passport.authenticate("google", { scope: ["profile", "email"] }));

router.route("/auth/google/callback").get(
  passport.authenticate("google", {
    successRedirect: process.env.CLIENT_URL,
    failureRedirect: "/login/failed",
  }),
  googleLogin
);

router.route("/login").post(loginUser);

router.route("/register/sendEmailOTP").post(emailRegister);

router.route("/register/verifyOTP").post(verifyOTP);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/register/verifyOTP/resendOTPCode").post(resendOTPCode);

router.route("/login/phone").post(loginPhoneUser);

router.route("/emailResetPassword").post(emailResetPassword);

// router.route("/register/sendMobileOTP").post(mobileRegister);

// router.route("/register/verifyMobileOTP").post(verifyMobileOTP);

//protected route
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);
router
  .route("/profileImage")
  .patch(verifyJWT, upload.single("avatar"), handleProfileImage);

router
  .route("/coverImage")
  .patch(verifyJWT, upload.single("coverPhoto"), handleCoverImage);

router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails);

router.route("/updatePassword").patch(verifyJWT, updatePassword);

export default router;
