import nodemailer from "nodemailer";
import { google } from "googleapis";
import ApiError from "./ApiError.js";
import OTP from "../models/userOTP.model.js";

import { hashData } from "../utils/hashData.js";

// Configure OAuth2 client using environment variables
const oAuth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

const createTransport = async () => {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.AUTH_EMAIL,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      accessToken,
    },
  });
};

const sendVerificationEmail = async (transport, email, otp) => {
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Email Verification",
    text: `Enter ${otp} in the app to verify your email address. This code expires in 1 hour.`,
    html: `<p>Enter <b>${otp}</b> in the app to verify your email address.</p><br><p>This code <b>expires in 1 hour</b></p>`,
  };

  await transport.sendMail(mailOptions);
};

export const sendEmail = async ({ email }) => {
  try {

    const transport = await createTransport();
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    await OTP.deleteMany({ email });
   

    // Send verification email
    await sendVerificationEmail(transport, email, otp);
    const hashedOTP = await hashData(otp);
    const newOTP = await new OTP({
      email,
      otp: hashedOTP,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
    });

    await newOTP.save();

    return {
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        email,
      },
    };
  } catch (error) {
    throw new ApiError(
      400,
      "Failed to send verification email: " + error.message
    );
  }
};
