import mobileOTP from "../models/mobileOTP.model.js";
import ApiError from "./ApiError.js";
import twilio from "twilio";
import { hashData } from "./hashData.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const sendMessage = async (contact) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
   
    await mobileOTP.deleteMany({ contact });

    const hashedOTP = await hashData(otp);

    await twilioClient.messages.create({
      body: `Enter ${otp} in the app to verify your phone number. This code expires in 1 hour.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact,
    });

    const newOTP = await new mobileOTP({
      contact,
      otp: hashedOTP,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await newOTP.save();
    return {
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        contact,
      },
    };
  } catch (error) {
    throw new ApiError(
      400,
      "Failed to send verification otp: " + error.message
    );
  }
};

export default sendMessage;
