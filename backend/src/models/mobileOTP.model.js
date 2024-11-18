import { Schema, model } from "mongoose";
const phoneOTPSchema = new Schema({
  contact: {
    type: String,
    unique: true,
  },
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});
const mobileOTP = model("mobileOTP", phoneOTPSchema);

export default mobileOTP;
