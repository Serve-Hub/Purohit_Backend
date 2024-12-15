import Router from "express";
import {
  addPuja,
//   editPuja,
  deletePuja,
} from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/addPuja", upload.single("pujaImage"), addPuja);
// router.put("/editPuja/:id", upload.single("pujaImage"), editPuja);
router.delete("/deletePuja/:id", deletePuja);
export default router;
