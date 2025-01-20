import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  createBooking,
  viewNotification,
  acceptBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
  markAllAsRead,
  rejectBookingNotification,
  viewUserBooking,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Create a booking
router.post("/bookings/:pujaId", createBooking);

// View notifications (with pagination)
router.get("/notifications", viewNotification);

// Mark all notifications as read
router.put("/notifications/mark-all-as-read", markAllAsRead);

// Accept a booking request (notification)
router.put(
  "/notifications/accept/:notificationId",

  acceptBookingNotification
);

// Get accepted pandits for a specific booking
router.get(
  "/bookings/:bookingId/accepted-pandits",

  getAcceptedPandits
);

// Choose a pandit for a booking
router.post("/bookings/choose-pandit", choosePanditForPuja);

// Reject a booking request (notification)
router.put("/notifications/reject/:notificationId", rejectBookingNotification);

// View bookings for a user
router.get("/bookings/viewBooking", viewUserBooking);

export default router;
