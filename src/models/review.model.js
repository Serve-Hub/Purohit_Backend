import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    bookingID: {
      type: Schema.Types.ObjectId,
      ref: "Booking", // Reference to the Booking model
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, // Assuming a 1-5 star rating system
    },
    reviewText: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Review = model("Review", reviewSchema);

export default Review;
