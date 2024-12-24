import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  createBooking,
  viewNotification,
  acceptBookingNotification,
  getAcceptedPandits,
  choosePanditForPuja,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
router.post("/createBooking", createBooking);
router.get("/viewNotification", viewNotification);
router.post(
  "/acceptBookingNotification/:notificationId",
  acceptBookingNotification
);
router.post("/getAcceptedPandits/:bookingId", getAcceptedPandits);
router.post("/choosePanditForPuja", choosePanditForPuja);

export default router;
