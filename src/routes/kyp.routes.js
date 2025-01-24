import Router from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  fillKYP,
  viewAllKYP,
  viewKYP,
  updateKYPStatus,
  updateKYP,
  getKYPStatus,
} from "../controllers/kyp.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/fillKYP").post(
  upload.fields([
    { name: "qcertificate", maxCount: 1 },
    { name: "citizenshipFrontPhoto", maxCount: 1 },
    { name: "citizenshipBackPhoto", maxCount: 1 },
  ]),
  fillKYP
);
router.route("/viewAllKYP").post(viewAllKYP);
router.route("/viewKYP/:id").post(viewKYP);
router.route("/updateKYPStatus/:id").patch(updateKYPStatus);
router.route("/updateKYP/:kpyID").patch(updateKYP);
router.route("/getKYPStatus").get(getKYPStatus);

export default router;
