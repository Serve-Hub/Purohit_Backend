import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";

import {
  addReview,
  getPanditReviews,
  getAverageRating,
} from "../controllers/review.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post("/addReview", addReview);
router.put("/getPanditReviews/:panditId", getPanditReviews);
router.put("/getAverageRating/:panditId", getAverageRating);
export default router;
