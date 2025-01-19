import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import Puja from "../models/puja.model.js";
import Booking from "../models/booking.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  sendNotificationToPandits,
  sendNotificationToSpecificUser,
} from "../services/notification.service.js";
import Notification from "../models/notification.model.js";

const createBooking = asyncHandler(async (req, res) => {
  const { date, time, province, district, municipality, tollAddress } =
    req.body;

  if (
    !date ||
    !time ||
    !province ||
    !district ||
    !municipality ||
    !tollAddress
  ) {
    throw new ApiError(400, "Please provide all the required fields.");
  }
  const { pujaId } = req.params;
  const userID = req.user._id;

  const user = await User.findById(userID);
  if (!user) throw new ApiError(401, "Unauthorized. User not found.");

  const puja = await Puja.findById(pujaId);
  if (!puja) throw new ApiError(404, "Puja not found.");

  const existingBooking = await Booking.findOne({
    pujaID: pujaId,
    userID: userID,
  });

  if (existingBooking) {
    throw new ApiError(400, "You have  already booked this puja.");
  }

  const booking = new Booking({
    userID,
    pujaID: pujaId,
    date,
    time,
    location: {
      province,
      district,
      municipality,
      tollAddress,
    },
  });

  const savedBooking = await booking.save();

  const pandits = await User.find({ isPandit: true }).select(
    "-password -refreshToken"
  );

  if (!pandits || pandits.length === 0) {
    throw new ApiError(404, "No Pandits found in the database.");
  }

  const pujaInfo = await Puja.findById(pujaId);

  // const clients = req.app.locals.clients; // Access WebSocket clients from app.locals

  const notificationPromises = pandits
    .filter((pandit) => pandit._id.toString() !== user._id.toString()) // Exclude the user who made the booking
    .map(async (pandit) => {
      const notificationData = {
        senderID: user._id,
        receiverID: pandit._id,
        message: `New booking request for ${pujaInfo.pujaName} by ${req.user.firstName} on ${date} at ${time}.`,
        type: "Booking Request",
        relatedId: savedBooking._id,
        relatedModel: "Booking",
      };

      // Send the notification and handle WebSocket communication in the service
      await sendNotificationToPandits(
        pandit._id,
        notificationData,
        pujaInfo,
        savedBooking,
        user
      );
    });
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

const markAllAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id; // Assuming user is authenticated and available in req.user

  // Find all unread notifications for the user and mark them as read
  const result = await Notification.updateMany(
    { userID: userId, isRead: false },
    { isRead: true }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: "No unread notifications found" });
  }

  // Send a success response
  return res.status(200).json({
    message: "All notifications marked as read successfully",
    result,
  });
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
    Notification.find({ receiverID: userId }) // Directly find notifications for the logged-in user
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }), // Sort by newest first
    Notification.countDocuments({ receiverID: userId }), // Count notifications for the user
  ]);

  const totalPages =
    totalNotifications > 0 ? Math.ceil(totalNotifications / limit) : 0;

  //  await Notification.updateMany(
  //  { userID: userId, isRead: false }, // Only update unread notifications
  //  { $set: { isRead: true } } // Set `isRead` to true
  //  );
  //

  // Fetch bookings related to the user for enriching notifications

  const notificationsWithBookingInfo = await Promise.all(
    notifications.map(async (notification) => {
      const notifObj = notification.toObject();
      try {
        if (notifObj.relatedModel === "Booking") {
          const booking = await Booking.findById(notifObj.relatedId).lean();
          notifObj.bookingDetails = booking || null;
          if (booking) {
            const pujaDetail = await Puja.findById(booking.pujaID)
              .select("-password -refreshToken")
              .lean();
            notifObj.pujaDetails = pujaDetail || null;
          }
        }
        const senderUser = await User.findById(notifObj.senderID).lean();
        notifObj.senderDetails = senderUser || null;
      } catch (error) {
        console.error("Error fetching notification:", error);
      }
      return notifObj;
    })
  );

  // Respond with paginated notifications
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: notificationsWithBookingInfo,
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

  // Notify the user that the pandit has accepted the booking
  const notificationData = {
    senderID: req.user._id,
    receiverID: user._id,
    message: `Pandit ${req.user.firstName} has accepted the booking for ${booking.pujaID}.`,
    type: "Booking Acceptance",
    relatedId: booking._id,
    relatedModel: "Booking",
  };

  await sendNotificationToSpecificUser(user._id, notificationData);

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Booking Notification accepted."));
});

const rejectBookingNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params; // The ID of the notification the pandit rejects

  // Fetch the notification
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new ApiError(404, "Notification not found.");

  // Find the recipient's record for the pandit in the notification's recipients array
  if (notification.status !== "Pending") {
    throw new ApiError(400, "Notification already accepted or declined.");
  }

  notification.status = "Rejected";
  await notification.save();

  // Find the related booking
  const booking = await Booking.findById(notification.relatedId);
  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  const user = await User.findById(booking.userID);
  if (!user) throw new ApiError(404, "User not found.");
  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Booking Notification rejected."));
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

  const acceptedPandits = acceptedNotifications.map((notification) =>
    notification.userID.toString()
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

  // Notify the selected pandit
  const notificationData = {
    senderID: req.user._id,
    receiverID: panditId,
    message: `You have been selected for the booking of ${booking.pujaID}.`,
    type: "Booking Selection",
    relatedId: booking._id,
    relatedModel: "Booking",
  };

  await sendNotificationToSpecificUser(panditId, notificationData);

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Pandit selected successfully."));
});

export {
  createBooking,
  viewNotification,
  acceptBookingNotification,
  rejectBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
  markAllAsRead,
};
