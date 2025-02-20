import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import KYP from "../models/kyp.model.js";
import mongoose from "mongoose";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { sendNotificationToSpecificUser } from "../services/notification.service.js";

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

  return res
    .status(200)
    .json(new ApiResponse(200, kyp, "KYP filled successfully"));
});

const viewAllKYP = asyncHandler(async (req, res) => {
  // Extract `page` and `limit` from query parameters, with default values
  const page = Math.max(1, parseInt(req.query.page, 10) || 1); // Ensure page is at least 1
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10); // Ensure limit is at least 1
  const skip = (page - 1) * limit;

  const [kypRecords, totalCount] = await Promise.all([
    KYP.find().skip(skip).limit(limit),
    KYP.countDocuments(),
  ]);

  const allKYPs = await Promise.all(
    kypRecords.map(async (kyp) => {
      const user = await User.findById(kyp.panditID).select("-password"); // Fetch user details
      return {
        ...kyp.toObject(),
        userDetails: user || null, // Attach user details or null if not found
        isUserKYP: !!user, // Indicate if the KYP belongs to a user
      };
    })
  );

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Respond with paginated data
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: allKYPs,
        pagination: {
          totalItems: totalCount,
          totalPages: totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      },
      "All KYPs are:"
    )
  );
});

const viewKYP = asyncHandler(async (req, res) => {
  console.log("inside viewKYP");
  const kypID = req.params.id;
  const validID = mongoose.isValidObjectId(kypID);

  if (!validID) {
    throw new ApiError(400, "Invalid KYP ID");
  }

  const kyp = await KYP.findById(kypID);
  if (!kyp) {
    throw new ApiError(404, "KYP not found");
  }
  const user = await User.findById(kyp.panditID).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, { kyp, user }, "KYP is:"));
});

const updateKYPStatus = asyncHandler(async (req, res) => {
  const kypID = req.params.id;
  const validID = mongoose.isValidObjectId(kypID);

  if (!validID) {
    throw new ApiError(400, "Invalid KYP ID");
  }

  const { status, message } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }
  const kyp = await KYP.findByIdAndUpdate(
    kypID,
    { status },
    { new: true, runValidators: true }
  );
  if (!kyp) {
    throw new ApiError(404, "KYP not found");
  }
  const user = await User.findById(kyp.panditID);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let notificationMessage = "";

  if (status === "accepted") {
    user.isPandit = true;
    await user.save();
    notificationMessage =
      "Congratulations! Your KYP request has been accepted. You are now a registered Pandit.";
  } else if (status === "rejected") {
    notificationMessage = `Your KYP request has been rejected. Reason: ${message}`;
  }

  const notificationData = {
    receiverID: user._id,
    senderID: req.user._id,
    message: notificationMessage,
    type: "General",
  };

  await sendNotificationToSpecificUser(user._id, notificationData);

  return res.status(200).json(new ApiResponse(200, kyp, "KYP status updated"));
});

const updateKYP = asyncHandler(async (req, res) => {
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

  const { kpyID } = req.params;
  const existingKYP = await KYP.findById(kpyID);

  if (!existingKYP) {
    throw new ApiError(404, "KYP not found");
  }

  const files = req.files;
  const qcertificateLocalPath = files?.qcertificate?.[0]?.path || null;
  const citizenshipFrontPhotoLocalPath =
    files?.citizenshipFrontPhoto?.[0]?.path || null;
  const citizenshipBackPhotoLocalPath =
    files?.citizenshipBackPhoto?.[0]?.path || null;

  const updatedDocuments = { ...existingKYP.documents };

  // Update the qualification certificate if a new file is provided
  if (qcertificateLocalPath) {
    const qcertificateImage = await uploadOnCloudinary(qcertificateLocalPath);
    updatedDocuments.qualificationCertificate = qcertificateImage.url;
  }

  // Update the citizenship front photo if a new file is provided
  if (citizenshipFrontPhotoLocalPath) {
    const citizenshipFrontPhotoImage = await uploadOnCloudinary(
      citizenshipFrontPhotoLocalPath
    );
    updatedDocuments.citizenshipFrontPhoto = citizenshipFrontPhotoImage.url;
  }

  // Update the citizenship back photo if a new file is provided
  if (citizenshipBackPhotoLocalPath) {
    const citizenshipBackPhotoImage = await uploadOnCloudinary(
      citizenshipBackPhotoLocalPath
    );
    updatedDocuments.citizenshipBackPhoto = citizenshipBackPhotoImage.url;
  }

  // Update the existing KYP entry
  existingKYP.phoneNumber = phoneNumber || existingKYP.phoneNumber;
  existingKYP.dateOfBirth = {
    day: day || existingKYP.dateOfBirth.day,
    month: month || existingKYP.dateOfBirth.month,
    year: year || existingKYP.dateOfBirth.year,
  };
  existingKYP.temporaryAddress = {
    province: province || existingKYP.temporaryAddress.province,
    district: district || existingKYP.temporaryAddress.district,
    municipality: municipality || existingKYP.temporaryAddress.municipality,
    tolAddress: tolAddress || existingKYP.temporaryAddress.tolAddress,
  };
  existingKYP.permanentAddress = {
    province: pmProvince || existingKYP.permanentAddress.province,
    district: pmDistrict || existingKYP.permanentAddress.district,
    municipality: pmMun || existingKYP.permanentAddress.municipality,
    tolAddress: pmToladdress || existingKYP.permanentAddress.tolAddress,
  };
  existingKYP.qualification = qualification || existingKYP.qualification;
  existingKYP.experience = experience || existingKYP.experience;
  existingKYP.institution = institution || existingKYP.institution;
  existingKYP.documents = updatedDocuments;

  await existingKYP.save();

  return res
    .status(200)
    .json(new ApiResponse(200, existingKYP, "KYP updated successfully"));
});

const getKYPStatus = asyncHandler(async (req, res) => {
  const kyp = await KYP.find({ panditID: req.user._id }).select("status");
  if (!kyp) {
    throw new ApiError(404, "KYP not found");
  }
  res.status(200).json(new ApiResponse(200, kyp, "KYP fetched successfully."));
});

export {
  fillKYP,
  viewAllKYP,
  viewKYP,
  updateKYPStatus,
  updateKYP,
  getKYPStatus,
};
