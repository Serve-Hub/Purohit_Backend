import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { sendEmail } from "../utils/mailer.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateOTPToken } from "../utils/auth.js";
import { verifyHashedData, hashData } from "../utils/hashData.js";
import bcrypt from "bcrypt";
import OTP from "../models/userOTP.model.js";
import sendMessage from "../utils/messageSender.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wring while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // res.send("Register user route");
  const { email, firstName, lastName, password } = req.body;
  const trimmedEmail = email?.trim();
  const trimmedFirstName = firstName?.trim();
  const trimmedLastName = lastName?.trim();
  // const trimmedContact = contact?.trim();
  // const trimmedAvatar = avatar?.trim();
  const hasEmptyField = [
    trimmedEmail,
    trimmedFirstName,
    trimmedLastName,
    password,
    // trimmedContact,
    // trimmedAvatar,
  ].some((field) => field === "");

  if (hasEmptyField) {
    throw new ApiError(400, "All fields are required and cannot be empty.");
  }
  // console.log(trimmedEmail);
  const existingUser = await User.findOne({ email: trimmedEmail });

  //if email already exists throw error
  if (existingUser && !existingUser.googleId) {
    throw new ApiError(409, "User with email already exists");
  }

  if (existingUser && existingUser.googleId && existingUser.password) {
    throw new ApiError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // const avatarLocalPath = req.file?.path;

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file is required.");
  // }

  const { token } = generateOTPToken({
    email: trimmedEmail,
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    password: hashedPassword,
    // contact: trimmedContact,
    // avatar: avatarLocalPath,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { token }, "Registration Success!"));
});
export default registerUser;

export const emailRegister = asyncHandler(async (req, res) => {
  const { token, email } = req.body;
  const trimmedEmail = email?.trim();

  if (!trimmedEmail || !token) {
    throw new ApiError(400, "All fields are required and cannot be empty.");
  }

  const existingUser = await User.findOne({ email: trimmedEmail });

  //if email already exists throw error
  if (existingUser && !existingUser.googleId && !existingUser.password) {
    throw new ApiError(409, "User  already exists");
  }

  await sendEmail({ email: trimmedEmail });

  return res
    .status(201)
    .json(new ApiResponse(201, { token }, "OTP sent Success!"));
});

export const mobileRegister = asyncHandler(async (req, res) => {
  const { firstName, lastName, password, contact } = req.body;
  const trimmedContact = contact?.trim();
  const trimmedFirstName = firstName?.trim();
  const trimmedLastName = lastName?.trim();

  if (!trimmedContact || !trimmedFirstName || !trimmedLastName || !password) {
    throw new ApiError(400, "All fields are required and cannot be empty.");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await User.findOne({ contact: trimmedContact });

  //if email already exists throw error
  if (existingUser) {
    throw new ApiError(409, "User with contact already exists");
  }
  const { token } = generateOTPToken({
    // email: null,
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    password: hashedPassword,
    contact: trimmedContact,
    // avatar: avatarLocalPath,
  });
  await sendMessage(trimmedContact);

  return res
    .status(201)
    .json(new ApiResponse(201, { token }, "Registration Success!"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = email?.trim();
  if (!password && !trimmedEmail) {
    throw new ApiError(400, "Fields cannot be empty");
  }

  const user = await User.findOne({ email: trimmedEmail });
  if (!user) {
    return res.status(400).send({ error: "User does not exist." });
  }
  if (!user.isVerified) {
    return res.status(400).send({ error: "User is not verified." });
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).send({ error: "Invalid user credentials." });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

export const loginPhoneUser = asyncHandler(async (req, res) => {
  const { contact, password } = req.body;
  const trimmedContact = contact?.trim();
  if (!password && !trimmedContact) {
    throw new ApiError(400, "Fields cannot be empty");
  }

  const user = await User.findOne({ contact: trimmedContact });
  if (!user) {
    return res.status(400).send({ error: "User does not exist." });
  }
  if (!user.isVerified) {
    return res.status(400).send({ error: "User is not verified." });
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).send({ error: "Invalid user credentials." });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

export const emailResetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;
  const trimmedEmail = email?.trim();
  const trimmedOtp = otp?.trim();
  if (!trimmedEmail || !trimmedOtp || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }
  if (!newPassword === confirmPassword) {
    throw new ApiError(400, "Password match failed");
  }

  const userOTP = await OTP.findOne({
    email: trimmedEmail,
  });
  const match = await verifyHashedData(otp, userOTP.otp);
  if (!match) {
    throw new ApiError(400, "Invalid OTP.");
  }
  const hashedPassword = await hashData(newPassword);
  await User.updateOne({ email }, { password: hashedPassword });
  await OTP.deleteMany({ email });
  res.status(200).json(new ApiResponse(200, {}, "Password reset successful."));
});

export const mobileResetPassword = asyncHandler(async (req, res) => {
  const { contact, otp, newPassword, confirmPassword } = req.body;
  const trimmedContact = contact?.trim();
  const trimmedOtp = otp?.trim();
  if (!trimmedContact || !trimmedOtp || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }
  if (!newPassword === confirmPassword) {
    throw new ApiError(400, "Password match failed");
  }

  const userOTP = await mobileOTP.findOne({
    contact: trimmedContact,
  });
  const match = await verifyHashedData(otp, userOTP.otp);
  if (!match) {
    throw new ApiError(400, "Invalid OTP.");
  }
  const hashedPassword = await hashData(newPassword);
  await User.updateOne({ contact }, { password: hashedPassword });
  await mobileOTP.deleteMany({ contact });
  res.status(200).json(new ApiResponse(200, {}, "Password reset successful."));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Expired refresh token");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { firstName, lastName, bio } = req.body;

  if (!firstName || !lastName) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        firstName,
        lastName,
        bio,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."));
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword || !oldPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Password match failed");
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

export const handleProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required.");
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  const user = await User.findById(req.user?._id).select("avatar");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // If an avatar already exists, delete it from Cloudinary
  if (user.avatar) {
    const publicId = user.avatar.split("/").pop().split(".")[0];
    await deleteFromCloudinary(publicId); // Delete from Cloudinary
  }

  // Upload the new avatar
  const avatarImage = await uploadOnCloudinary(avatarLocalPath);

  // Update the user's avatar in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(400, "User Image update failed.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedUser },
        "Profile image handled successfully."
      )
    );
});

export const handleCoverImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Cover file is required.");
  }

  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "Cover file is required.");
  }

  const user = await User.findById(req.user?._id).select("coverPhoto");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // If a cover photo already exists, delete it from Cloudinary
  if (user.coverPhoto) {
    const publicId = user.coverPhoto.split("/").pop().split(".")[0];
    await deleteFromCloudinary(publicId);
  }

  // Upload the new cover photo
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  // Update the user's cover photo in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverPhoto: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(400, "User update failed.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { updatedUser }, "Cover image handled successfully.")
    );
});

export const googleLogin = asyncHandler(async (req, res, next) => {
  const user = req.user; // This is set by Passport during Google OAuth

  if (!user) {
    throw new ApiError(400, "Google login failed");
  }

  try {
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    // console.log("token is here", accessToken);

    res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .cookie("loggedin", "true")
      .cookie("isAdmin", user.isAdmin)
      .cookie("isPandit", user.isPandit);

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // res
    //   .status(200)
    //   .json(
    //     new ApiResponse(
    //       200,
    //       userInfo,
    //       "User logged in successfully with Google"
    //     )
    //   );
    res.redirect(process.env.CLIENT_URL);
  } catch (error) {
    throw new ApiError(500, "Google login failed: " + error.message);
  }
});
