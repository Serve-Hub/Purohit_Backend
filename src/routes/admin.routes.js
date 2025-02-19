import Router from "express";
import {
  addPuja,
  editPuja,
  deletePuja,
  getPujas,
  searchPuja,
  getSpecificPuja,
  getAllPanditUsers,
  getTop5Pandits,
  getTotalBookings,
  getTop5Pujas,
} from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post("/addPuja", upload.single("pujaImage"), addPuja);
router.patch("/editPuja/:id", upload.single("pujaImage"), editPuja);
router.get("/getPujas", getPujas);
router.delete("/deletePuja/:id", deletePuja);
router.get("/searchPuja", searchPuja);
router.get("/getSpecificPuja/:id", getSpecificPuja);
router.get("/getAllPanditUsers", getAllPanditUsers);
router.get("/getTop5Pandits", getTop5Pandits);
router.get("/getTop5Pujas", getTop5Pujas);
router.get("/getTotalBookings", getTotalBookings);
export default router;
