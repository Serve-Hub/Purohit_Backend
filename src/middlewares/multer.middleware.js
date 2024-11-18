import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.AVATAR_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4(); // Generate a unique identifier
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/; // Allow image file types
  const isValid = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isMimetypeValid = allowedTypes.test(file.mimetype);

  if (isValid && isMimetypeValid) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false); // Reject the file
  }
};

export const upload = multer({ storage, fileFilter });
