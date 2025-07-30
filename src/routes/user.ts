import { Router } from "express";
import {
  addDetails,
  getEvents,
  getNotifications,
  joinEvent,
  requestEvent,
  resetPassword,
  submitFeedback,
  uploadMedia,
} from "../controllers/user";
import { authenticateToken } from "../middlewares/auth";
import { upload } from "../config/multer";

const router = Router();

router.use(authenticateToken);
router.post("/reset-password", resetPassword);
router.get("/events", getEvents);
router.post("/userdetails", addDetails);
router.post("/request-event", requestEvent);
router.post("/feedback/:event", submitFeedback);
router.post("/join/:event", joinEvent);
router.post("/upload", upload.array("files"), uploadMedia);
router.get("/notifications", getNotifications)

export default router;
