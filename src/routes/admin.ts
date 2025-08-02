import express from "express";
import {
  addEvent,
  approveRequest,
  createEvent,
  editEvent,
  editRequest,
  getEventRequests,
  getEvents,
} from "../controllers/event";
import { authenticateToken } from "../middlewares/auth";
import { authorizeAdmin } from "../middlewares/authAdmin";
import { getNotifications } from "../controllers/user";
import { uploadSingleImage } from "../config/multer";
import eventService from "../services/event";

const router = express.Router();

router.use(authenticateToken);

router.post(
  "/event/add",
  authorizeAdmin,
  uploadSingleImage.single("file"),
  async (req, res) => {
    try {
      const parsedEvent = {
        eventDetails: JSON.parse(req.body.eventDetails),
        vehicleInfo: JSON.parse(req.body.vehicleInfo),
        paymentDetails: JSON.parse(req.body.paymentDetails),
      };

      const result = await eventService.addEvent(parsedEvent, req);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error parsing or creating event:", error);
      const message =
        error instanceof Error ? error.message : "Unknown server error";

      res.status(400).json({ message: "Invalid request", error: message });
    }
  }
);

router.post("/event/:event/create", authorizeAdmin, createEvent);
router.patch(
  "/event/:event/edit",
  authorizeAdmin,
  uploadSingleImage.single("file"),
  editEvent
);
router.post("/request/:event/approve", authorizeAdmin, approveRequest);

router.get("/events", authorizeAdmin, getEvents);
router.get("/event-requests", authorizeAdmin, getEventRequests);
router.get("/notifications", authorizeAdmin, getNotifications);

export default router;
