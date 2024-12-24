import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import Puja from "../models/puja.model.js";
import Booking from "../models/booking.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import sendNotification from "../services/notification.service.js";
import Notification from "../models/notification.model.js";

const createBooking = asyncHandler(async (req, res) => {
  const { pujaId, day, month, year, time, location, amount } = req.body;

  if (!pujaId || !day || !month || !year || !time || !location || !amount) {
    throw new ApiError(400, "Please provide all the required fields.");
  }

  const user = req.user;
  if (!user) throw new ApiError(401, "Unauthorized. User not found.");
  const puja = await Puja.findById(pujaId);
  if (!puja) throw new ApiError(404, "Puja not found.");

  const existingBooking = await Booking.findOne({
    pujaID: pujaId,
    "date.day": day,
    "date.month": month,
    "date.year": year,
    time,
  });

  if (existingBooking) {
    throw new ApiError(
      400,
      "This Puja is already booked for the selected time."
    );
  }
  //? Should we check for conflicting bookings for the same user?
  // const conflictingBooking = await Booking.findOne({
  //   userID: user._id,
  //   "date.day": day,
  //   "date.month": month,
  //   "date.year": year,
  //   time,
  // });

  // if (conflictingBooking) {
  //   throw new ApiError(
  //     400,
  //     "You already have another booking at the selected time."
  //   );
  // }

  const booking = new Booking({
    userID: user._id,
    pujaID: pujaId,
    date: { day, month, year },
    time,
    location,
    amount,
  });

  const savedBooking = await booking.save();

  const pandits = await User.find({ isPandit: true }).select(
    "-password -refreshToken"
  );

  if (!pandits || pandits.length === 0) {
    throw new ApiError(404, "No Pandits found in the database.");
  }

  const notificationPromises = pandits.map((pandit) =>
    sendNotification({
      userId: pandit._id,
      message: `New booking request from ${user.firstName} for ${puja.pujaName} on ${year}/${month}/${day} at ${time}.`,
      type: "Booking Request",
      relatedId: savedBooking._id,
      relatedModel: "Booking",
    })
  );

  try {
    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new ApiError(500, "Failed to send notifications.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "Booking successful", savedBooking));
});

const viewNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized. User not found.");
  }

  // Get pagination parameters from query string with defaults
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  // Fetch notifications with pagination
  const [notifications, totalNotifications] = await Promise.all([
    Notification.find({ userID: userId }) // Directly find notifications for the logged-in user
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }), // Sort by newest first
    Notification.countDocuments({ userID: userId }), // Count notifications for the user
  ]);

  const totalPages = Math.ceil(totalNotifications / limit);

  //  await Notification.updateMany(
  //  { userID: userId, isRead: false }, // Only update unread notifications
  //  { $set: { isRead: true } } // Set `isRead` to true
  //  );
  //

  // Respond with paginated notifications
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        pagination: {
          currentPage: page,
          totalPages,
          totalNotifications,
          limit,
        },
      },
      "Notifications retrieved successfully."
    )
  );
});

const acceptBookingNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params; // The ID of the notification the pandit accepts
  const panditId = req.user._id; // Assuming `req.user` holds the logged-in pandit
  // Fetch the notification
  const notification = await Notification.findById(notificationId);

  if (!notification) throw new ApiError(404, "Notification not found.");

  // Find the recipient's record for the pandit in the notification's recipients array
  if (notification.status !== "Pending") {
    throw new ApiError(400, "Notification already accepted or declined.");
  }

  notification.status = "Accepted";
  await notification.save();

  // Find the related booking
  const booking = await Booking.findById(notification.relatedId);

  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  const user = await User.findById(booking.userID);
  if (!user) throw new ApiError(404, "User not found.");
  console.log(user);

  const userNotification = `Pandit ${user.firstName} has accepted your booking request.`;

  await sendNotification({
    userId: user._id,
    message: userNotification,
    type: "Booking Acceptance",
    relatedId: booking._id,
    relatedModel: "Booking",
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        notification,
        `Pandit ${req.user.firstName} has successfully accepted the booking.`
      )
    );
});

const getAcceptedPandits = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Assuming `req.user` holds the logged-in user
  const { bookingId } = req.params;

  // Fetch the booking details
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  if (booking.userID.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized access.");
  }

  // Fetch accepted pandits for this booking
  const acceptedPandits = await Notification.find({
    relatedId: booking._id,
    relatedModel: "Booking",
    status: "Accepted",
  }).select("userID");

  if (!acceptedPandits.length) {
    throw new ApiError(404, "No accepted pandits found.");
  }

  const panditIds = acceptedPandits.map((notif) => notif.userID);

  // Fetch the pandit details from the User model
  const pandits = await User.find({ _id: { $in: panditIds } }).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, pandits, "Accepted pandits retrieved successfully.")
    );
});

const choosePanditForPuja = asyncHandler(async (req, res) => {
  const { bookingId, panditId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  if (booking.userID.toString() !== req.user._id.toString())
    throw new ApiError(403, "Unauthorized access.");

  // Ensure the pandit is among the accepted ones
  const acceptedNotifications = await Notification.find({
    relatedId: booking._id,
    relatedModel: "Booking",
    status: "Accepted",
  }).select("userID");

  const acceptedPandits = acceptedNotifications.map((notif) =>
    notif.userID.toString()
  );

  if (!acceptedPandits.includes(panditId)) {
    throw new ApiError(400, "Pandit not among the accepted ones.");
  }

  if (booking.selectedPandit.includes(panditId)) {
    throw new ApiError(
      400,
      "Pandit has already been selected for this booking."
    );
  }

  // Update the booking to reflect that the user has selected the pandit
  booking.selectedPandit.push(panditId);
  booking.panditAcceptedCount += 1;
  await booking.save();

  // Notify the pandit about their selection
  await sendNotification({
    userId: panditId,
    message: `You have been selected by ${req.user.firstName} for the puja.`,
    type: "Booking Selection",
    relatedId: booking._id,
    relatedModel: "Booking",
  });
  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Pandit selected successfully."));
});

export {
  createBooking,
  viewNotification,
  acceptBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
};
