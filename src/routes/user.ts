import { Router } from "express";
import {
  addDetails,
  addMessage,
  getEvents,
  getNotifications,
  getUserInvoice,
  getUserMedia,
  joinEvent,
  requestEvent,
  resetPassword,
  submitFeedback,
  uploadMedia,
} from "../controllers/user";
import { authenticateToken } from "../middlewares/auth";
import { uploadMultiple, uploadSingleImage } from "../config/multer";
import { payThruStripe } from "../controllers/payment";

const router = Router();

router.use(authenticateToken);

router.get("/events", getEvents);
router.get("/event/media/:event", getUserMedia);
router.get("/event/invoice/:event", getUserInvoice);
router.get("/notifications", getNotifications);
router.post("/reset-password", resetPassword);
router.post("/userdetails", addDetails);
router.post("/add-message/:event", addMessage);
router.post("/request-event", uploadSingleImage.single("file"), async (req, res, next) => {
  try {
    const parsedEvent = {
      eventDetails: JSON.parse(req.body.eventDetails),
      vehicleInfo: JSON.parse(req.body.vehicleInfo),
      cohosts: req.body.cohosts ? JSON.parse(req.body.cohosts) : [],
      tripNotes: req.body.tripNotes
    };

    // Update req.body with parsed data
    req.body = parsedEvent;
    
    // Call the original controller
    return requestEvent(req, res, next);
  } catch (error) {
    console.error("Error parsing or creating event request:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    res.status(400).json({ message: "Invalid request", error: message });
  }
});
router.post("/feedback/:event", submitFeedback);
router.post("/join/:token", joinEvent);
router.post("/upload/:event", uploadMultiple.array("files"), uploadMedia);
router.post("/payment/stripe/:event", payThruStripe);
router.post("/payment/stripe/remaining/:event", payThruStripe);

export default router;
