import asyncHandler from "../utils/asyncHandler";
import Puja from "../models/puja.model";

const addPuja = asyncHandler(async (req, res) => {
  const { pujaName, pujaImage, baseFare, category, duration, description } =
    req.body;
  if (
    !pujaName ||
    !pujaImage ||
    !baseFare ||
    !category ||
    !duration ||
    !description
  ) {
    res.status(400);
    throw new Error("Fields cannot be left empty.");
  }
  const pujaImageLocalPath = req.file?.path;
  if (!pujaImageLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }
  const puja = await Puja.create({
    pujaName,
    pujaImageLocalPath,
    baseFare,
    category,
    duration,
    description,
  });
  res.status(201).json({ message: "Puja added successfully", puja });
});

