import { Schema, model } from "mongoose";

const addressSchema = new Schema({
  province: { type: String, required: true }, // Dropdown for Province
  district: { type: String, required: true }, // Dropdown for State
  municipality: { type: String, required: true }, // Dropdown for Rural/Municipality
  tolAddress: { type: String, required: true }, // Text input for Tol
});

const KYPSchema = new Schema(
  {
    panditID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: {
        values: ["pending", "accepted", "rejected"],
        message: "{VALUE} is not a valid status",
      },
    },
    phoneNumber: { type: String, required: true }, // Phone Number
    dateOfBirth: {
      // Combined Day, Month, and Year
      day: { type: Number, required: true },
      month: { type: Number, required: true },
      year: { type: Number, required: true },
    },
    temporaryAddress: { type: addressSchema, required: true }, // Temporary Address
    permanentAddress: { type: addressSchema, required: true }, // Permanent Address
    qualification: { type: String, required: true }, // Qualification
    experience: { type: String, required: true }, // Experience
    institution: { type: String, required: true }, // Institution Name
    documents: {
      qualificationCertificate: { type: String, required: true }, // Path to Qualification Certificate
      citizenshipFrontPhoto: { type: String, required: true },
      citizenshipBackPhoto: { type: String, required: true },
    },
  },
  {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);

//create a table
const KYP = model("KYP", KYPSchema);

export default KYP;

// phoneNumber: "",
// day: "",
// month: "",
// year: "",
// province: "",
// district: "",
// district: "",
// municipality: "",
// tolAddress: "",
// pmProvince: "",
// pmDistrict: "",
// pmToladdress: "",
// pmMun: "",
// qualification: "",
// experience: "",
// institution: "",
// qcertificate: null,
// citizenshipFrontPhoto: null,
// citizenshipBackPhoto: null
