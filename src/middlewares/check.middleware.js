import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError"; // Make sure to import your ApiError class

const checkVerified = asyncHandler(async (req, res, next) => {
  if (!req.user.isVerified) {
    return next(
      new ApiError(403, "User not verified. Please verify your email")
    ); // Pass the error to next
  }
  next(); // Proceed to the next middleware or route handler
});

export default checkVerified;
