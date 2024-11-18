import jwt from "jsonwebtoken";

export const generateOTPToken = (userData) => {
  const expiresIn = "60m";

  // Create JWT with user data and OTP
  const token = jwt.sign({ ...userData }, process.env.OTP_SECRET, {
    expiresIn,
  });

  return { token };
};
