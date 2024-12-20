import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import KYP from "../models/kyp.model.js";
import mongoose from "mongoose";
import uploadOnCloudinary from "../utils/cloudinary.js";

const fillKYP = asyncHandler(async (req, res) => {
  const {
    phoneNumber,
    day,
    month,
    year,
    province,
    district,
    municipality,
    tolAddress,
    pmProvince,
    pmDistrict,
    pmToladdress,
    pmMun,
    qualification,
    experience,
    institution,
  } = req.body;

  const panditID = req?.user._id;
  const user = await User.findById(panditID);

  if (!user) {
    throw new ApiError(409, "User not found");
  }

  const existingKYP = await KYP.findOne({ panditID });

  if (existingKYP) {
    throw new ApiError(400, "KYP already filled");
  }

  const files = req.files;
  const qcertificateLocalPath = files?.qcertificate?.[0]?.path || null;
  const citizenshipFrontPhotoLocalPath =
    files?.citizenshipFrontPhoto?.[0]?.path || null;
  const citizenshipBackPhotoLocalPath =
    files?.citizenshipBackPhoto?.[0]?.path || null;

  if (
    !qcertificateLocalPath ||
    !citizenshipFrontPhotoLocalPath ||
    !citizenshipBackPhotoLocalPath
  ) {
    throw new ApiError(404, "Please upload all the required documents");
  }

  const qcertificateImage = await uploadOnCloudinary(qcertificateLocalPath);
  const citizenshipFrontPhotoImage = await uploadOnCloudinary(
    citizenshipFrontPhotoLocalPath
  );
  const citizenshipBackPhotoImage = await uploadOnCloudinary(
    citizenshipBackPhotoLocalPath
  );

  const kyp = new KYP({
    panditID,
    phoneNumber,
    dateOfBirth: { day: day, month: month, year: year },
    temporaryAddress: {
      province,
      district,
      municipality,
      tolAddress,
    },
    permanentAddress: {
      province: pmProvince,
      district: pmDistrict,
      municipality: pmMun,
      tolAddress: pmToladdress,
    },
    qualification,
    experience,
    institution,
    documents: {
      qualificationCertificate: qcertificateImage.url,
      citizenshipFrontPhoto: citizenshipFrontPhotoImage.url,
      citizenshipBackPhoto: citizenshipBackPhotoImage.url,
    },
  });

  await kyp.save();

  res.status(200).json(new ApiResponse("KYP filled successfully", kyp));
});

const viewAllKYP = asyncHandler(async (req, res) => {
  // Extract `page` and `limit` from query parameters, with default values
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
  const skip = (page - 1) * limit;

  // Fetch paginated data
  const allKYPs = await KYP.find().skip(skip).limit(limit);

  // Get the total count of documents
  const totalCount = await KYP.countDocuments();

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Respond with paginated data
  res.status(200).json(
    new ApiResponse("All KYPs are:", {
      data: allKYPs,
      pagination: {
        totalItems: totalCount,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    })
  );
});

const viewKYP = asyncHandler(async (req, res) => {
  const kypID = req.params.id;
  console.log(kypID);
  const validID = mongoose.isValidObjectId(kypID);
  if (!validID) {
    throw new ApiError(400, "Invalid KYP ID");
  }

  const kyp = await KYP.findById(kypID);
  if (!kyp) {
    throw new ApiError(404, "KYP not found");
  }
  return res.status(200).json(new ApiResponse("KYP is:", kyp));
});

const updateKYPStatus = asyncHandler(async (req, res) => {
  const kypID = req.params.id;
  const { status } = req.body;
  const kyp = await KYP.findByIdAndUpdate(
    kypID,
    { status },
    { new: true, runValidators: true }
  );
  if (!kyp) {
    throw new ApiError(404, "KYP not found");
  }
  return res.status(200).json(new ApiResponse("KYP status updated", kyp));
});

export { fillKYP, viewAllKYP, viewKYP, updateKYPStatus };
