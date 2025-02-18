import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import Puja from "../models/puja.model.js";
import Booking from "../models/booking.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Review from "../models/review.model.js";
import { sendNotificationToSpecificUser } from "../services/notification.service.js";

export const addReview = asyncHandler(async (req, res) => {
  const { panditId, pujaId, bookingId, rating, reviewText } = req.body;
  const user = req.user;
  const puja = await Puja.findById(pujaId);
  if (!puja) {
    throw new ApiError(400, "Puja not found.");
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    status: { $ne: "Cancelled" },
  });

  if (booking.status != "Completed") {
    throw new ApiError(400, "Booking must be completed to give review.");
  }

  const pandit = await User.findById(panditId);
  if (!pandit) {
    throw new ApiError(400, "User not found.");
  }
  console.log(booking.userID, user._id);
  if (booking.userID.toString() !== user._id.toString()) {
    throw new ApiError(403, "Unauthorized to review .");
  }

  const existingReview = await Review.findOne({
    bookingID: bookingId,
    user: user._id,
  });
  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this Pandit.");
  }

  const newReview = new Review({
    user: user._id,
    pandit: panditId,
    puja: pujaId,
    bookingID: bookingId,
    rating,
    reviewText,
  });
  await newReview.save();

  const notificationData = {
    senderID: req.user._id,
    receiverID: panditId,
    message: `User ${req.user.firstName} provided you a review.`,
    type: "Review",
    relatedId: newReview._id,
    relatedModel: "Review",
  };

  await sendNotificationToSpecificUser(
    panditId,
    notificationData,
    booking,
    req.user
  );

  return res
    .status(201)
    .json(new ApiResponse(200, newReview, "Review submitted  successfully"));
});

export const getPanditReviews = asyncHandler(async (req, res) => {
  const { panditId } = req.params;
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default limit to 10 reviews per page
  const skip = (page - 1) * limit;

  // Get total count of reviews
  const totalReviews = await Review.countDocuments({ pandit: panditId });

  // Fetch reviews with pagination
  const reviews = await Review.find({ pandit: panditId })
    .populate("user")
    .populate("puja")
    .populate("pandit")
    .populate("bookingID")
    .skip(skip)
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        pagination: {
          totalReviews,
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          hasNextPage: page * limit < totalReviews,
          hasPrevPage: page > 1,
        },
      },
      "Reviews retrieved successfully"
    )
  );
});

export const getAverageRating = asyncHandler(async (req, res) => {
  const { panditId } = req.params;

  // Ensure the ID is valid
  if (!mongoose.Types.ObjectId.isValid(panditId)) {
    throw new ApiError(400, "Invalid Pandit ID");
  }

  const result = await Review.aggregate([
    { $match: { pandit: new mongoose.Types.ObjectId(panditId) } }, // Filter by Pandit ID
    {
      $group: {
        _id: "$pandit",
        averageRating: { $avg: "$rating" }, // Calculate average rating
        totalReviews: { $sum: 1 }, // Count total reviews
      },
    },
  ]);

  // Handle case where there are no reviews
  if (result.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          averageRating: "0.00",
          totalReviews: 0,
        },
        "No reviews yet"
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        averageRating: result[0].averageRating.toFixed(2), // Round to 2 decimal places
        totalReviews: result[0].totalReviews,
      },
      "Average rating retrieved successfully"
    )
  );
});
