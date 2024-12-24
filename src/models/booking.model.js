import { Schema, model } from "mongoose";

const bookingSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    pujaID: {
      type: Schema.Types.ObjectId,
      ref: "Puja", // Reference to the puja model
      required: true,
    },
    panditID: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the Pandit user, since they also use the User model
      // required: true,
    },
    selectedPandit: {
      type: [Schema.Types.ObjectId],
      ref: "User", // Reference to the pandit the user selects
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Completed", "Cancelled"],
      default: "Pending",
    },
    panditAcceptedCount: {
      type: Number,
      default: 0,
    },
    date: {
      day: { type: Number, required: true },
      month: { type: Number, required: true },
      year: { type: Number, required: true },
    },
    time: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Completed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    amount: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Booking = model("Booking", bookingSchema);

export default Booking;
