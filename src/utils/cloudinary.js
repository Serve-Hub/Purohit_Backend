import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import ApiError from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  if (typeof localFilePath !== "string") {
    throw new Error("Invalid file path. Expected a string.");
  }
  try {
    if (!localFilePath) return null;
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return result;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw new ApiError(500, "Error uploading file to Cloudinary", [
      error.message,
    ]);
  }
};

export default uploadOnCloudinary;

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    throw new ApiError(400, "Public ID is required to delete an image.");
  }
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
    } else {
      throw new ApiError(500, "Failed to delete image from Cloudinary");
    }
  } catch (error) {
    throw new ApiError(500, "Error deleting file from Cloudinary", [
      error.message,
    ]);
  }
};
