import asyncHandler from "../utils/asyncHandler.js";
import Puja from "../models/puja.model.js";
import ApiError from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";

const addPuja = asyncHandler(async (req, res) => {
  const { pujaName, baseFare, category, duration, description } = req.body;
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
  const puja = await Puja.create({
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
  const hasEmptyFields = Object.values(newValues).some(
    (value) => value?.trim() === ""
  );

  if (hasEmptyFields) {
    throw new ApiError(400, "All fields are required");
  }
  const puja = await Puja.findById(pujaId);

  if (!puja) {
    throw new ApiError(404, "Puja not found");
  }

  let updatedFields = { ...newValues };

  if (req.file) {
    const oldImageURL = puja.pujaImage;
    const publicId = oldImageURL?.split("/").pop().split(".")[0];

    if (publicId) {
      const deleteResult = await cloudinary.uploader.destroy(publicId);
      if (deleteResult.result !== "ok") {
        throw new ApiError(400, "Error deleting old image from Cloudinary");
      }
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
    page = 1,
    limit = 10,
    category,
    minPrice,
    maxPrice,
    minDuration,
    maxDuration,
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

export { addPuja, editPuja, getPujas, deletePuja };
