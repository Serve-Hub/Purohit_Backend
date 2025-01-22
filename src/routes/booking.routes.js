import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  createBooking,
  viewNotification,
  acceptUserBooking,
  getAcceptedPandits,
  choosePanditForPuja,
  markAllAsRead,
  rejectBookingNotification,
  viewUserBooking,
  viewPanditBooking,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Create a booking
router.post("/bookings/:pujaId", createBooking);

// View notifications (with pagination)
router.get("/notifications", viewNotification);

// Mark all notifications as read
router.put("/notifications/mark-all-as-read", markAllAsRead);

// Accept user booking request
router.put("/bookings/acceptUserBooking/:bookingId", acceptUserBooking);

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

// View bookings
router.get("/bookings/viewPanditBooking", viewPanditBooking);

export default router;
