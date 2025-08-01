import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const allowedMimeTypes = ["image/jpeg", "image/png", "video/mp4"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".mp4"];

const baseFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = allowedMimeTypes.includes(file.mimetype);
  const isValidExt = allowedExtensions.includes(ext);

  if (isValidMime && isValidExt) {
    cb(null, true);
  } else {
    console.warn(
      `Blocked upload: ${file.originalname} (mime: ${file.mimetype}, ext: ${ext})`
    );
    cb(new Error("Unsupported file type. Only JPG, PNG, MP4 allowed."));
  }
};

const imageOnlyFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

const limits = {
  files: Number(process.env.MAX_FILES || 10),
  fileSize: Number(process.env.MAX_FILE_SIZE || 5) * 1024 * 1024,
};

export const uploadMultiple = multer({
  storage,
  limits,
  fileFilter: baseFileFilter,
});

export const uploadSingleImage = multer({
  storage,
  limits: { ...limits, files: 1 },
  fileFilter: imageOnlyFilter,
});
