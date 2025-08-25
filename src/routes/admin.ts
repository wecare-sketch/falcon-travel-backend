import express from "express";
import {
  approveRequest,
  createEvent,
  deleteEvent,
  deleteRequest,
  editRequest,
  getEventMedia,
  getEventRequests,
  getEvents,
} from "../controllers/event";
import { authenticateToken } from "../middlewares/auth";
import { authorizeAdmin } from "../middlewares/authAdmin";
import { getNotifications } from "../controllers/user";
import { uploadSingleImage } from "../config/multer";
import {
  getKpis,
  getUpcoming,
  getPaymentStatus,
  getMonthlyTargets,
  getRecentActivities,
  getDashboardTotal,
} from "../controllers/dashboard";
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
  async (req, res) => {
    try {
      const parsedEvent = {
        eventDetails: JSON.parse(req.body.eventDetails),
        vehicleInfo: JSON.parse(req.body.vehicleInfo),
        paymentDetails: JSON.parse(req.body.paymentDetails),
      };

      const result = await eventService.editEvent(
        req.params.event,
        parsedEvent
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error parsing or editing event:", error);
      const message =
        error instanceof Error ? error.message : "Unknown server error";

      res.status(400).json({ message: "Invalid request", error: message });
    }
  }
);

router.patch(
  "/request/:request/edit",
  authorizeAdmin,
  uploadSingleImage.single("file"),
  async (req, res, next) => {
    try {
      const parsedEvent = {
        eventDetails: JSON.parse(req.body.eventDetails),
        vehicleInfo: JSON.parse(req.body.vehicleInfo),
        cohosts: req.body.cohosts ? JSON.parse(req.body.cohosts) : [],
      };

      req.body = parsedEvent;

      return editRequest(req, res, next);
    } catch (error) {
      console.error("Error parsing edit request:", error);
      const message =
        error instanceof Error ? error.message : "Unknown server error";

      return res
        .status(400)
        .json({ message: "Invalid request", error: message });
    }
  }
);
router.post("/request/:event/approve", authorizeAdmin, approveRequest);

router.get("/events", authorizeAdmin, getEvents);
router.get("/event-requests", authorizeAdmin, getEventRequests);
router.get("/notifications", authorizeAdmin, getNotifications);
router.get("/event/media/:event", authorizeAdmin, getEventMedia);

router.delete("/event/:event/delete", deleteEvent);
router.delete("/request/:request/delete", deleteRequest);

router.get("/dashboard/kpis", authorizeAdmin, getKpis);
router.get("/dashboard/upcoming", authorizeAdmin, getUpcoming);
router.get("/dashboard/payment-status", authorizeAdmin, getPaymentStatus);
router.get("/dashboard/monthly-targets", authorizeAdmin, getMonthlyTargets);
router.get("/dashboard/activities", authorizeAdmin, getRecentActivities);
router.get("/dashboard", authorizeAdmin, getDashboardTotal);

export default router;
