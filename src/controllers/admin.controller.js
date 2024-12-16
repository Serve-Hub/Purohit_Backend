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

// const getAllVideos = asyncHandler(async (req, res) => {
//   const page = req.query.page || 1;
//   const limit = req.query.limit || 3;
//   const query = req.query.query || "";
//   const sortType = req.query.sort || "asc";
//   const sortBy = req.query.sortBy || "createdAt";
//   //query ma kehi napathauda
//   const pageNumber = parseInt(page);
//   const limitNumber = parseInt(limit);
//   const sort = sortType === "asc" ? 1 : -1;

//   console.log(
//     "sabai parameters" +
//       "page is" +
//       page +
//       "limit is" +
//       limit +
//       "query is" +
//       query +
//       "sorttype is" +
//       sort +
//       "sortby is" +
//       sortBy,
//     pageNumber,
//     limitNumber
//   );

//   const matchStage = query ? { title: { $regex: query, $options: "i" } } : {}; //$options:i for case insesitive
//   //  extra double quotes should not be included in the regex pattern, which can cause  query to not find any matches in the database.
//   console.log("matchstage", matchStage);

//   const result = await videoModel.aggregate([
//     {
//       $match: matchStage,
//     },
//     {
//       $sort: { [sortBy]: sort }, // Sort based on the provided field and order. Use square brackets when you want to dynamically assign an object key based on a variable’s value.
//     },
//     {
//       $skip: (pageNumber - 1) * limitNumber, // Skip the results for previous pages
//     },
//     {
//       $limit: limitNumber, // Limit the results to the specified page size
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "result",
//       },
//     },
//   ]);

//   console.log("return videos", result);
//   if (result.length === 0) {
//     //array return garxa ,ani empty pani huna sakxa
//     throw new ApiError(404, "No videos found matching the query");
//   }
//   console.log("legnth is", result.length);
//   const totalCount = result.length;

//   if (!totalCount) {
//     throw new ApiError(404, "error in counting values");
//   }
//   if (!result) {
//     throw new ApiError(400, "there was error in retrieving the video data");
//   }
//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { result, totalCount },
//         "video retrieved succesfully"
//       )
//     );
// });
// const getPujas = asyncHandler(async (req, res) => {
//   const page = req.query.page || 1;
//   const limit = req.query.limit || 10;
//   const category = req.query.category || "";
//   const minPrice = req.query.minPrice || 0;
//   const maxPrice = req.query.maxPrice || Infinity;
//   const minDuration = req.query.minDuration || 0;
//   const maxDuration = req.query.maxDuration || Infinity;
//   const sortType = req.query.sort || "asc";
//   const sortBy = req.query.sortBy || "createdAt";

//   // Pagination setup
//   const pageNumber = parseInt(page);
//   const limitNumber = parseInt(limit);
//   const sort = sortType === "asc" ? 1 : -1;

//   // console.log(
//   //   "All parameters: " +
//   //   "page is " +
//   //   page +
//   //   " | limit is " +
//   //   limit +
//   //   " | category is " +
//   //   category +
//   //   " | minPrice is " +
//   //   minPrice +
//   //   " | maxPrice is " +
//   //   maxPrice +
//   //   " | minDuration is " +
//   //   minDuration +
//   //   " | maxDuration is " +
//   //   maxDuration +
//   //   " | sortType is " +
//   //   sortType +
//   //   " | sortBy is " +
//   //   sortByRemove unnecessary blank line in admin.routes.js; add console logs for debugging in auth.middleware.js
//   // );

//   // Construct dynamic filter query based on the parameters
//   const filterQuery = {};
//   if (category) filterQuery.category = category;
//   if (minPrice || maxPrice) {
//     filterQuery.baseFare = {};
//     if (minPrice) filterQuery.baseFare.$gte = minPrice;
//     if (maxPrice) filterQuery.baseFare.$lte = maxPrice;
//   }
//   if (minDuration || maxDuration) {
//     filterQuery.duration = {};
//     if (minDuration) filterQuery.duration.$gte = minDuration;
//     if (maxDuration) filterQuery.duration.$lte = maxDuration;
//   }

//   // console.log("filterQuery:", filterQuery);

//   // Aggregation query
//   const result = await Puja.aggregate([
//     {
//       $match: filterQuery, // Filter based on the query
//     },
//     {
//       $sort: { [sortBy]: sort }, // Sorting based on the provided field and order
//     },
//     {
//       $skip: (pageNumber - 1) * limitNumber, // Skip results for previous pages
//     },
//     {
//       $limit: limitNumber, // Limit results to the specified page size
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "ownerDetails",
//       },
//     },
//   ]);

//   // console.log("Returned pujas:", result);

//   if (result.length === 0) {
//     throw new ApiError(404, "No pujas found matching the query");
//   }

//   const totalCount = await Puja.countDocuments(filterQuery); // Count total pujas after applying filters

//   if (!totalCount) {
//     throw new ApiError(404, "Error in counting pujas");
//   }

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         result,
//         totalCount,
//         totalPages: Math.ceil(totalCount / limitNumber),
//         currentPage: pageNumber,
//       },
//       "Pujas retrieved successfully"
//     )
//   );
// });
export { addPuja, editPuja, getPujas, deletePuja, searchPuja };
