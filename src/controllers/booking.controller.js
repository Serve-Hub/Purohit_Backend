import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import Puja from "../models/puja.model.js";
import Booking from "../models/booking.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import KYP from "../models/kyp.model.js";
import {
  sendNotificationToPandits,
  sendNotificationToSpecificUser,
} from "../services/notification.service.js";
import Notification from "../models/notification.model.js";
import Review from "../models/review.model.js";
import mongoose from "mongoose";

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
    { receiverID: userId, isRead: false }, // Only unread notifications for the user
    { $set: { isRead: true } } // Mark them as read
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, { result }, "All notifications marked as read.")
    );
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
            const pujaDetail = await Puja.findById(booking.pujaID).lean();
            notifObj.pujaDetails = pujaDetail || null;
          }
        }
        const senderUser = await User.findById(notifObj.senderID)
          .select("-password -refreshToken")
          .lean();
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

const acceptNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) throw new ApiError(404, "Notification not found.");

  if (notification.status !== "Pending") {
    throw new ApiError(400, "Notification already accepted or declined.");
  }

  notification.status = "Accepted";
  await notification.save();

  const booking = await Booking.findById(notification.relatedId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  const user = await User.findById(booking.userID);
  if (!user) throw new ApiError(404, "User not found.");

  booking.acceptedPandit.push(req.user._id);
  await booking.save();

  const notificationData = {
    senderID: req.user._id,
    receiverID: user._id,
    message: `Pandit ${req.user.firstName} has accepted the booking for ${booking.pujaID}.`,
    type: "Booking Acceptance",
    relatedId: booking._id,
    relatedModel: "Booking",
  };

  await sendNotificationToSpecificUser(
    user._id,
    notificationData,
    booking,
    req.user
  );

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Booking accepted successfully."));
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

  notification.status = "Declined";
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
  const booking = await Booking.findById(bookingId).populate({
    path: "acceptedPandit",
    select: "-password -refreshToken", // Exclude sensitive fields here
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  if (booking.userID.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized access.");
  }
  const kypDetails = await KYP.find({
    panditID: {
      $in: booking.acceptedPandit.map((pandit) => {
        return pandit._id; // Ensure the ID is returned for the query
      }),
    },
  });

  const combinedDetails = booking.acceptedPandit.map((pandit) => {
    const kyp = kypDetails.find((kypEntry) => {
      console.log(kypEntry);
      return kypEntry.panditID.toString() === pandit._id.toString();
    });
    return {
      ...pandit.toObject(),
      kypDetails: kyp || null,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        combinedDetails,
        "Accepted pandits retrieved successfully."
      )
    );
});

const choosePanditForPuja = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { bookingId, panditId } = req.body;

  if (!bookingId || !panditId) {
    throw new ApiError(400, "Both bookingId and panditId are required.");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  if (booking.userID.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized access.");
  }

  // Edge Case 4: Check if the pandit is in the acceptedPandit list
  if (
    !booking.acceptedPandit.some(
      (pandit) => pandit._id.toString() === panditId.toString()
    )
  ) {
    throw new ApiError(
      400,
      "The selected pandit has not accepted the booking."
    );
  }
  if (
    booking.selectedPandit &&
    booking.selectedPandit.toString() === panditId.toString()
  ) {
    throw new ApiError(400, "The selected pandit has already been chosen.");
  }

  // Update the booking to reflect that the user has selected the pandit
  booking.acceptedPandit.pop(panditId);
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

  await sendNotificationToSpecificUser(
    panditId,
    notificationData,
    booking,
    req.user
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Pandit selected successfully."));
});

const rejectPanditForPuja = asyncHandler(async (req, res) => {
  const { bookingId, panditId } = req.body;
  if (!bookingId || !panditId) {
    throw new ApiError(400, "Both bookingId and panditId are required.");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  if (booking.userID.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized access.");
  }
  if (
    !booking.acceptedPandit.some(
      (pandit) => pandit._id.toString() === panditId.toString()
    )
  ) {
    throw new ApiError(
      400,
      "The selected pandit has not accepted the booking."
    );
  }

  if (
    booking.selectedPandit &&
    booking.selectedPandit.toString() === panditId.toString()
  ) {
    throw new ApiError(400, "The selected pandit has already been chosen.");
  }

  booking.acceptedPandit.pop(panditId);
  await booking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Pandit rejected successfully."));
});

// const viewUserBooking = asyncHandler(async (req, res) => {
//   const userId = req.user?._id;

//   // Validate user existence
//   if (!userId) {
//     throw new ApiError(401, "Unauthorized. User not found.");
//   }

//   // Pagination setup
//   const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
//   const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
//   const skip = (page - 1) * limit;

//   // Fetch bookings with puja and selected pandit details
//   const [bookings, totalBookings] = await Promise.all([
//     Booking.find({ userID: userId })
//       .populate("pujaID") // Populate puja details
//       .populate({
//         path: "selectedPandit", // Populate selected pandit details
//         select: "-password -refreshToken", // Exclude sensitive fields
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Booking.countDocuments({ userID: userId }), // Total count for pagination
//   ]);

//   // Respond with paginated data
//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         bookings,
//         currentPage: page,
//         totalPages: Math.ceil(totalBookings / limit),
//         totalBookings,
//       },
//       "Bookings retrieved successfully."
//     )
//   );
// });

// const viewUserBooking = asyncHandler(async (req, res) => {
//   const userId = req.user?._id;

//   // Validate user existence
//   if (!userId) {
//     throw new ApiError(401, "Unauthorized. User not found.");
//   }

//   // Pagination setup
//   const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
//   const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
//   const skip = (page - 1) * limit;

//   // Retrieve bookings with pagination
//   const [bookings, totalBookings] = await Promise.all([
//     Booking.find({ userID: userId })
//       .populate("pujaID") // Populate puja details with specific fields
//       .sort({ createdAt: -1 }) // Sort bookings by creation date (latest first)
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//     Booking.countDocuments({ userID: userId }), // Total count for pagination
//   ]);

//   // Extract all selectedPandit IDs in a single iteration
//   const uniquePanditIds = [
//     ...new Set(
//       bookings
//         .filter((b) => b.selectedPandit?.length > 0)
//         .flatMap((b) => b.selectedPandit)
//     ),
//   ];

//   // Fetch related panditDetails and kypDetails in parallel
//   const [panditDetails, panditKypDetails] = await Promise.all([
//     uniquePanditIds.length
//       ? User.find({ _id: { $in: uniquePanditIds } })
//           .select("-password -refreshToken")
//           .lean()
//       : [],
//     uniquePanditIds.length
//       ? KYP.find({ panditID: { $in: uniquePanditIds } }).lean()
//       : [],
//   ]);

//   // Map fetched details for quick lookup
//   const panditDetailsMap = panditDetails.reduce(
//     (acc, pandit) => ({ ...acc, [pandit._id.toString()]: pandit }),
//     {}
//   );

//   const panditKypDetailsMap = panditKypDetails.reduce(
//     (acc, kyp) => ({ ...acc, [kyp.panditID.toString()]: kyp }),
//     {}
//   );

//   // Enhance bookings with selected pandit details
//   const enhancedBookings = bookings.map((booking) => {
//     if (booking.selectedPandit?.length > 0) {
//       const selectedPandits = booking.selectedPandit.map((id) => ({
//         panditDetails: panditDetailsMap[id] || null,
//         kypDetails: panditKypDetailsMap[id] || null,
//       }));
//       return { ...booking, selectedPandits };
//     }
//     return booking;
//   });

//   // Respond with paginated data
//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         enhancedBookings,
//         currentPage: page,
//         totalPages: Math.ceil(totalBookings / limit),
//         totalBookings,
//       },
//       "Bookings retrieved successfully."
//     )
//   );
// });

const viewUserBooking = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  // Validate user existence
  if (!userId) {
    throw new ApiError(401, "Unauthorized. User not found.");
  }

  // Pagination setup
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
  const skip = (page - 1) * limit;

  // Retrieve bookings with pagination
  const [bookings, totalBookings] = await Promise.all([
    Booking.find({ userID: userId })
      .populate("pujaID") // Populate puja details with specific fields
      .sort({ createdAt: -1 }) // Sort bookings by creation date (latest first)
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments({ userID: userId }), // Total count for pagination
  ]);

  // Extract all selectedPandit IDs in a single iteration and convert to strings
  const uniquePanditIds = [
    ...new Set(
      bookings
        .filter((b) => b.selectedPandit?.length > 0)
        .flatMap((b) => b.selectedPandit)
        .map((id) => id.toString()) // Ensure IDs are strings
    ),
  ];

  // Fetch pandit KYP details and populate user details
  const panditKypDetails = uniquePanditIds.length
    ? await KYP.find({ panditID: { $in: uniquePanditIds } })
        .populate({
          path: "panditID", // Populate user details from userID reference
          select: "-password -refreshToken", // Exclude sensitive fields
        })
        .lean()
    : [];

  // console.log("Pandit KYP Details ", panditKypDetails); // Check the final map after reduction
  const panditDetailsMap = panditKypDetails.reduce((acc, kyp) => {
    acc[kyp.panditID._id.toString()] = kyp; // Store KYP details in a map using panditID
    return acc;
  }, {});

  // Combine bookings and panditKypDetails into a new structure
  const bookingsWithPanditDetails = bookings.map((booking) => {
    const selectedPanditWithKYP = booking.selectedPandit.map((panditId) => {
      const panditKYP = panditDetailsMap[panditId.toString()] || null; // Get KYP details from map
      return {
        panditID: panditId,
        panditKYP, // Add KYP details to the pandit info
      };
    });

    return {
      ...booking,
      selectedPanditWithKYP, // Attach the enhanced selected pandits with KYP details
    };
  });

  // Respond with paginated data
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookingsWithPanditDetails,
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
      },
      "Bookings retrieved successfully."
    )
  );
});

const viewPanditBooking = asyncHandler(async (req, res) => {
  const panditId = req.user._id; // Assuming logged-in pandit's ID is stored in req.user

  // Validate pandit existence
  if (!panditId) {
    throw new ApiError(401, "Unauthorized. User not found.");
  }

  // Pagination setup
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 bookings per page
  const skip = (page - 1) * limit;

  // Fetch bookings where the pandit is in the selectedPandit array
  const [bookings, totalBookings] = await Promise.all([
    Booking.find({ selectedPandit: { $in: [panditId] } })
      .populate("pujaID") // Populate puja details with specific fields if necessary
      .sort({ createdAt: -1 }) // Sort by creation time (latest first)
      .skip(skip) // Skip records for pagination
      .limit(limit) // Limit records per page
      .lean(), // Return plain JavaScript objects
    Booking.countDocuments({ selectedPandit: { $in: [panditId] } }), // Count total bookings
  ]);

  const uniqueUserIds = [
    ...new Set(bookings.map((b) => b.userID?.toString()).filter(Boolean)), // Ensure user IDs are strings
  ];

  const userDetailsMap = uniqueUserIds.length
    ? await User.find({ _id: { $in: uniqueUserIds } })
        .select("-password -refreshToken") // Exclude sensitive fields
        .lean()
        .then((users) =>
          users.reduce((acc, user) => {
            acc[user._id.toString()] = user; // Map user details by ID
            return acc;
          }, {})
        )
    : {};

  const bookingsWithUserDetails = bookings.map((booking) => ({
    ...booking,
    user: userDetailsMap[booking.userID?.toString()] || null, // Attach user details or null if not found
  }));

  // Respond with the bookings and pagination details
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings: bookingsWithUserDetails,
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
      },
      "Bookings retrieved successfully."
    )
  );
});

const checkPoojaBookingStatus = asyncHandler(async (req, res) => {
  const { poojaId } = req.params; // Pooja ID from the frontend
  const userId = req.user._id; // Logged-in user's ID

  // Check if the user has booked this pooja
  const existingBooking = await Booking.findOne({
    pujaID: poojaId,
    userID: userId,
    status: { $ne: "Cancelled" },
  });

  // Send the booking status
  return res.status(200).json({
    hasBooked: !!existingBooking, // true if a booking exists, false otherwise
    message: existingBooking
      ? "User has already booked this pooja."
      : "User has not booked this pooja yet.",
  });
});

const pujaStatusUpdate = asyncHandler(async (req, res) => {
  const { bookingId } = req.params; // Pooja ID from the frontend
  const userId = req.user._id; // Logged-in user's ID

  // Check if the user has booked this pooja
  const existingBooking = await Booking.findOne({
    _id: bookingId,
    status: { $ne: "Cancelled" },
  });

  if (existingBooking.status == "Completed") {
    throw new ApiError(400, "Booking Already Completed.");
  }
  // if (existingBooking.status != "Accepted") {
  //   throw new ApiError(400, "Booking not Accepted.");
  // }
  existingBooking.status = "Completed";
  await existingBooking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Bookings Completed successfully."));
});

export const panditDetails = asyncHandler(async (req, res) => {
  const { panditId } = req.params;

  // Count the number of bookings where the pandit is in acceptedPandit and status is "Completed"
  const totalPujas = await Booking.countDocuments({
    selectedPandit: panditId,
    status: "Completed",
  });

  const totalReviews = await Review.countDocuments({
    pandit: panditId,
  });

  // Count total number of ratings given to the pandit
  const avegrageRating = await Review.aggregate([
    { $match: { pandit: new mongoose.Types.ObjectId(panditId) } }, // Filter by Pandit ID
    {
      $group: {
        _id: "$pandit",
        averageRating: { $avg: "$rating" }, // Calculate average rating
        totalReviews: { $sum: 1 }, // Count total reviews
      },
    },
  ]);

  const totalRaters = await Review.countDocuments({
    pandit: panditId,
    rating: { $exists: true },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalPujas, avegrageRating, totalRaters, totalReviews },
        "Booking information retrived."
      )
    );
});

export {
  createBooking,
  viewNotification,
  acceptNotification,
  rejectBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
  markAllAsRead,
  viewUserBooking,
  viewPanditBooking,
  checkPoojaBookingStatus,
  rejectPanditForPuja,
  pujaStatusUpdate,
};
