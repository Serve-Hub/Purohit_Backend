import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    receiverID: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the user who will receive the notification
      required: true,
    },
    senderID: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the user who will receive the notification
      required: true,
    },
    isRead: {
      type: Boolean, // Marks if the notification has been read by this user
      default: false,
    },
    message: {
      type: String, // The notification message
      required: true,
    },
    type: {
      type: String,
      enum: [
        "Booking Request",
        "Booking Acceptance",
        "Booking Cancellation",
        "Booking Selection",
        "Payment",
        "Reminder",
        "General",
        "Review",
      ],
      default: "General",
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      refPath: "relatedModel",
    },
    relatedModel: {
      type: String,
      enum: ["Booking", "Pooja", "Review"], // Dynamically reference related models
    },
    status: {
      type: String,
      enum: ["Pending", "Sent", "Failed", "Accepted", "Declined"],
      default: "Pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Notification = model("Notification", notificationSchema);

export default Notification;
