import asyncHandler from "../utils/asyncHandler.js";
import Puja from "../models/puja.model.js";
import ApiError from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import User from "../models/user.model.js";
import Review from "../models/review.model.js";
import Booking from "../models/booking.model.js";

const addPuja = asyncHandler(async (req, res) => {
  const { pujaName, baseFare, category, duration, description } = req.body;
  const adminID = req?.user._id;
  if (
    [pujaName, baseFare, category, duration, description].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const pujaImageLocalPath = req.file?.path;
  if (!pujaImageLocalPath) {
    throw new ApiError(400, "Puja Image is required.");
  }
  const pujaImage = await uploadOnCloudinary(pujaImageLocalPath);
  console.log("Puja Image url is:", pujaImage.url);
  const puja = await Puja.create({
    adminID,
    pujaName,
    pujaImage: pujaImage.url,
    baseFare,
    category,
    duration,
    description,
  });
  return res
    .status(201)
    .json(new ApiResponse(200, puja, "Puja added successfully"));
});

const editPuja = asyncHandler(async (req, res) => {
  const pujaId = req.params.id;
  const validID = mongoose.isValidObjectId(pujaId);

  if (!validID) {
    return res.status(400).send({ message: "Invalid Mongo id" });
  }

  const newValues = req.body;

  // Check for empty fields
  // const hasEmptyFields = Object.values(newValues).some(
  //   (value) => value?.trim() === ""
  // );

  // if (hasEmptyFields) {
  //   throw new ApiError(400, "All fields are required");
  // }
  const puja = await Puja.findById(pujaId);

  if (!puja) {
    throw new ApiError(404, "Puja not found");
  }

  let updatedFields = { ...newValues };

  if (req.file) {
    const oldImageURL = puja.pujaImage;
    const publicId = oldImageURL?.split("/").pop().split(".")[0];

    if (publicId) {
      await deleteFromCloudinary(publicId); // Using the delete function
    }

    const newImagePath = req.file.path;

    const newImage = await uploadOnCloudinary(newImagePath);

    if (!newImage?.url) {
      throw new ApiError(400, "Error while uploading the new Puja image");
    }

    updatedFields.pujaImage = newImage.url; // Set the new image URL
  }

  const updatedPuja = await Puja.findByIdAndUpdate(
    pujaId,
    {
      $set: updatedFields,
    },
    { new: true }
  );

  if (!updatedPuja) {
    throw new ApiError(404, "Update failed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPuja, "Puja details updated successfully")
    );
});

const getPujas = asyncHandler(async (req, res) => {
  // Pagination and filtering parameters
  const {
    page = req.query.page || 1,
    limit = req.query.limit || 10,
    category = req.query.category || "",
    minPrice = req.query.minPrice || 0,
    maxPrice = req.query.maxPrice || Infinity,
    minDuration = req.query.minDuration || 0,
    maxDuration = req.query.maxDuration || Infinity,
  } = req.query;

  // Build the query object dynamically based on filters
  const filterQuery = {};

  if (category) {
    filterQuery.category = category;
  }

  if (minPrice || maxPrice) {
    filterQuery.baseFare = {};
    if (minPrice) filterQuery.baseFare.$gte = minPrice;
    if (maxPrice) filterQuery.baseFare.$lte = maxPrice;
  }

  if (minDuration || maxDuration) {
    filterQuery.duration = {};
    if (minDuration) filterQuery.duration.$gte = minDuration;
    if (maxDuration) filterQuery.duration.$lte = maxDuration;
  }

  // Calculate the number of documents to skip for pagination
  const skip = (page - 1) * limit;

  // Fetch pujas with filters and pagination
  const pujas = await Puja.find(filterQuery)
    .skip(skip)
    .limit(Number(limit))
    .exec();

  // Count total pujas after applying filters for pagination info
  const totalPujas = await Puja.countDocuments(filterQuery);

  // Return paginated and filtered response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        pujas,
        totalPujas,
        totalPages: Math.ceil(totalPujas / limit),
        currentPage: page,
      },
      "Filtered Pujas"
    )
  );
});

const getSpecificPuja = asyncHandler(async (req, res) => {
  const { id: pujaId } = req.params;
  const validID = mongoose.isValidObjectId(pujaId);

  if (!validID) {
    return res.status(400).send({ message: "Invalid Mongo id" });
  }

  const puja = await Puja.findById(pujaId);

  if (!puja) {
    throw new ApiError(404, "Puja not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, puja, "Puja found successful."));
});

const deletePuja = asyncHandler(async (req, res) => {
  const pujaId = req.params.id;
  const validID = mongoose.isValidObjectId(pujaId);

  if (!validID) {
    return res.status(400).send({ message: "Invalid Mongo id" });
  }

  const puja = await Puja.findById(pujaId);
  if (!puja) {
    throw new ApiError(404, "Puja not found");
  }

  const publicId = puja.pujaImage?.split("/").pop().split(".")[0];

  if (publicId) {
    const deleteResult = await cloudinary.uploader.destroy(publicId);
    if (deleteResult.result !== "ok") {
      throw new ApiError(400, "Error deleting image from Cloudinary");
    }
  }

  const deletedPuja = await Puja.findByIdAndDelete(pujaId);

  if (!deletedPuja) {
    throw new ApiError(404, "Delete failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedPuja, "Puja deleted successfully"));
});

const searchPuja = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    throw new ApiError(400, "Query is required");
  }

  const pujas = await Puja.find({
    pujaName: { $regex: query, $options: "i" },
  });

  if (!pujas || pujas.length === 0) {
    return res.status(404).json(new ApiResponse(404, [], "No pujas found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, pujas, "Pujas found matching the query string"));
});

const getAllPanditUsers = async (req, res) => {
  // Fetch users whose isPandit field is true
  const panditUsers = await User.find({ isPandit: true }).select(
    "-password -refreshToken"
  );

  const Users = await User.find({ isPandit: false, isAdmin: false }).select(
    "-password -refreshToken"
  );

  const UserCount = Users.length;

  // Count the number of pandit users
  const panditCount = panditUsers.length;
  // Return the list of pandit users
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { panditUsers, panditCount, Users, UserCount },
        "Pandits and Users Fetched successfully."
      )
    );
};

const getTop5Pandits = asyncHandler(async (req, res) => {
  // Aggregate the average rating for each pandit
  const topPandits = await Review.aggregate([
    {
      $group: {
        _id: "$pandit", // Group by pandit ID
        averageRating: { $avg: "$rating" }, // Calculate average rating
        reviewCount: { $sum: 1 }, // Count the number of reviews
      },
    },
    { $sort: { averageRating: -1, reviewCount: -1 } }, // Sort by rating and then by review count
    { $limit: 5 }, // Get the top 5
  ]);

  // Populate the pandit details
  const panditDetails = await User.find({
    _id: { $in: topPandits.map((p) => p._id) },
    isPandit: true,
  }).select("firstName lastName avatar bio");

  // Combine pandit details with their respective ratings
  const topPanditWithRatings = panditDetails.map((pandit) => {
    const ratingInfo = topPandits.find(
      (p) => p._id.toString() === pandit._id.toString()
    );
    return {
      ...pandit.toObject(),
      averageRating: ratingInfo ? ratingInfo.averageRating : 0,
      reviewCount: ratingInfo ? ratingInfo.reviewCount : 0,
    };
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        topPanditWithRatings,
        "Top 5 Pandits fetched successfully."
      )
    );
});

const getTop5Pujas = asyncHandler(async (req, res) => {
  // Aggregate the number of completed bookings for each puja
  const topPujas = await Booking.aggregate([
    { $match: { status: "Completed" } }, // Only count completed bookings
    {
      $group: {
        _id: "$pujaID", // Group by puja ID
        bookingCount: { $sum: 1 }, // Count the number of bookings
      },
    },
    { $sort: { bookingCount: -1 } }, // Sort by booking count in descending order
    { $limit: 5 }, // Get the top 5
  ]);

  // Populate the puja details
  const pujaDetails = await Puja.find({
    _id: { $in: topPujas.map((p) => p._id) },
  }).select("pujaName pujaImage category baseFare description");

  // Combine puja details with their respective booking counts
  const topPujasWithCount = pujaDetails.map((puja) => {
    const bookingInfo = topPujas.find(
      (p) => p._id.toString() === puja._id.toString()
    );
    return {
      ...puja.toObject(),
      bookingCount: bookingInfo ? bookingInfo.bookingCount : 0,
    };
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        topPujasWithCount,
        "Top 5 Pujas fetched successfully."
      )
    );
});

const getTotalBookings = asyncHandler(async (req, res) => {
  // Count the total number of bookings
  const totalBookings = await Booking.countDocuments();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalBookings },
        "Total bookings fetched successfully."
      )
    );
});

export {
  addPuja,
  editPuja,
  getPujas,
  deletePuja,
  searchPuja,
  getSpecificPuja,
  getAllPanditUsers,
  getTop5Pandits,
  getTop5Pujas,
  getTotalBookings,
};
