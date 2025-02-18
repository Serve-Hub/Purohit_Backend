import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  createBooking,
  viewNotification,
  acceptNotification,
  rejectBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
  markAllAsRead,
  viewUserBooking,
  checkPoojaBookingStatus,
  viewPanditBooking,
  rejectPanditForPuja,
  panditDetails,
  pujaStatusUpdate,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Create a booking
router.post("/bookings/:pujaId", createBooking);

// View notifications (with pagination)
router.get("/notifications", viewNotification);

// Mark all notifications as read
router.put("/notifications/mark-all-as-read", markAllAsRead);

// Get accepted pandits for a specific booking
router.get("/bookings/:bookingId/accepted-pandits", getAcceptedPandits);

// Accept a booking request (notification)
router.put("/notifications/accept/:notificationId", acceptNotification);

// Choose a pandit for a booking
router.post("/bookings/accepted-pandits/choosePandit", choosePanditForPuja);

// Reject a booking request (notification)
router.put("/notifications/reject/:notificationId", rejectBookingNotification);

// View bookings for a user
router.get("/bookings/viewBooking", viewUserBooking);

// View bookings
router.get("/bookings/viewPanditBooking", viewPanditBooking);

//view booking status
router.get(
  "/bookings/checkPoojaBookingStatus/:poojaId",
  checkPoojaBookingStatus
);

//reject pandit for booking
router.post("/bookings/accepted-pandits/rejectPandit", rejectPanditForPuja);

//booking completed
router.put("/bookings/pujaStatusUpdate/:bookingId", pujaStatusUpdate);

router.put("/panditDetails/:panditId", panditDetails);

export default router;
