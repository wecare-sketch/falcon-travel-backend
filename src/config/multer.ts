import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    files: Number(process.env.MAX_FILES || 10),
    fileSize: Number(process.env.MAX_FILE_SIZE || 5) * 1024 * 1024,
  },
});
