import asyncHandler from "../utils/asyncHandler.js";
import Puja from "../models/puja.model.js";
import ApiError from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import User from "../models/user.model.js";

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
  const panditUsers = await User.find({ isPandit: true });
  
  // Count the number of pandit users
  const panditCount = panditUsers.length;
  // Return the list of pandit users
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { panditUsers, panditCount },
        "Pandits Fetched successfully."
      )
    );
};

const getTop5Pandits = asyncHandler(async (req, res) => {});

export {
  addPuja,
  editPuja,
  getPujas,
  deletePuja,
  searchPuja,
  getSpecificPuja,
  getAllPanditUsers,
};
