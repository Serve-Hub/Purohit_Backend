import { Schema, model } from "mongoose";

const emailOTPSchema = new Schema({
  email: {
    type: String,
    unique: true,
  },
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

const OTP = model("OTP", emailOTPSchema);

export default OTP;
