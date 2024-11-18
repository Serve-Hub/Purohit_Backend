import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { sendEmail } from "../utils/mailer.js";
import sendMessage from "../utils/messageSender.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import OTP from "../models/userOTP.model.js";
import mobileOTP from "../models/mobileOTP.model.js";
// import { generateOTPToken } from "../utils/auth.js";
import bcrypt from "bcrypt";

import { verifyHashedData } from "../utils/hashData.js";

export const verifyOTP = asyncHandler(async (req, res) => {
  const { token, otp } = req.body;
  if (!token || !otp) {
    throw new ApiError(400, "Empty  details are not allowed");
  }
  try {
    const decoded = jwt.verify(token, process.env.OTP_SECRET);
    const userOTP = await OTP.findOne({
      email: decoded.email || decoded.userData.email,
    });
    console.log("opt=", otp, "userOTP= ", userOTP.otp);
    const match = await bcrypt.compare(otp, userOTP.otp);
    console.log(match);
    if (!match) {
      throw new ApiError(400, "Invalid OTP.");
    }
    //? check whether the otp is expired ot not
    const existingUser = await User.findOne({
      email: decoded.email || decoded.userData.email,
    });
    if (existingUser) {
      throw new ApiError(409, "User with this email already exists.");
    }

    const user = new User({
      email: decoded.email || decoded.userData.email,
      firstName: decoded.firstName || decoded.userData.firstName,
      lastName: decoded.lastName || decoded.userData.lastName,
      password: decoded.password || decoded.userData.password,
      contact: null,
      googleId: null,
      // avatar: decoded.avatar || decoded.userData.avatar,
      isVerified: true, // Mark the user as verified
    });

    // const incomingAvatar = await uploadOnCloudinary(user.avatar);
    // if (!incomingAvatar) {
    //   throw new ApiError(400, "Avatar upload failed.");
    // }
    await user.save();
    await OTP.deleteMany({ email: user.email });
    return res
      .status(200)
      .json({ message: "Email verified successfully, user created." });
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

export const resendOTPCode = asyncHandler(async (req, res) => {
  const { token, email } = req.body;
  if (!token || !email) {
    throw new ApiError(400, "Empty details are not allowed");
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.OTP_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid token.");
  }
  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.isVerified) {
    return res.status(400).json({
      status: "FAILED",
      message: "User is already verified. No need to resend OTP.",
    });
  }

  // const userData = {
  //   email: decoded.email,
  //   firstName: decoded.firstName,
  //   lastName: decoded.lastName,
  //   password: decoded.password,
  //   contact: decoded.contact,
  //   // avatar: decoded.avatar,
  // };

  // const newData = generateOTPToken({ userData });
  await sendEmail({ email });
  res.status(200).json({
    status: "PENDING",
    message: "OTP resent successfully. Please check your email.",
    token: token,
  });
});

export const verifyMobileOTP = asyncHandler(async (req, res) => {
  const { token, otp } = req.body;
  if (!token || !otp) {
    throw new ApiError(400, "Empty otp details are not allowed.");
  }
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.OTP_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid token.");
  }

  const userOTP = await mobileOTP.findOne({ contact: decoded.contact });
  const match = await verifyHashedData(otp, userOTP.otp);
  if (!match) {
    throw new ApiError(400, "Invalid OTP.");
  }
  const existingUser = await User.findOne({ contact: decoded.contact });
  if (existingUser) {
    throw new ApiError(409, "User with this contact already exists.");
  }
  const user = new User({
    email: null,
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    password: decoded.password,
    contact: decoded.contact,
    googleId: null,
    // avatar: decoded.avatar,
    isVerified: true,
  });
  // const incomingAvatar = await uploadOnCloudinary(user.avatar);
  // if (!incomingAvatar) {
  //   throw new ApiError(400, "Avatar upload failed.");
  // }
  await user.save();

  const deletedOTP = await mobileOTP.deleteMany({ contact: decoded.contact });

  return res
    .status(200)
    .json({ message: "Mobile number verified successfully, user created." });
});

export const resendMobileOTP = asyncHandler(async (req, res) => {
  const { token, contact } = req.body;
  if (!token || !contact) {
    throw new ApiError(400, "Empty details are not allowed.");
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.OTP_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid token.");
  }
  const existingUser = await User.findOne({ contact });
  if (existingUser && existingUser.isVerified) {
    return res.status(400).json({
      status: "FAILED",
      message: "User is already verified. No need to resend OTP.",
    });
  }
  // const userData = {
  //   email: decoded.email,
  //   firstName: decoded.firstName,
  //   lastName: decoded.lastName,
  //   password: decoded.password,
  //   contact: decoded.contact,
  //   // avatar: decoded.avatar,
  // };
  // const newData = generateOTPToken({ userData });
  await sendMessage(decoded.contact);
  res.status(200).json({
    status: "PENDING",
    message: "OTP resent successfully. Please check your phone.",
    token: token,
  });
});
