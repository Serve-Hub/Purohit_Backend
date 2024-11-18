import bcrypt from "bcrypt";
import asyncHandler from "./asyncHandler.js";

const hashData = async (data, saltRounds = 10) => {
  try {
    return await bcrypt.hash(data, saltRounds);
  } catch (error) {
    throw new Error("Failed to hash data: " + error.message);
  }
};

const verifyHashedData = async (unHashed, hashed) => {
  try {
    return await bcrypt.compare(unHashed, hashed);
  } catch (error) {
    throw new Error("Failed to verify hashed data: " + error.message);
  }
};
export { hashData, verifyHashedData };
