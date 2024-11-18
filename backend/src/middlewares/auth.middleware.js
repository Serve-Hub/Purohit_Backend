import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

const extractToken = (req) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "").trim();
  return token;
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken?._id) {
      throw new ApiError(401, "Invalid Access Token");
    }

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "User not found for the given token");
    }

    req.user = user;
    next();
  } catch (error) {
    c;
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export default verifyJWT;
