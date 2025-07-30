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

const router = express.Router();

router.use(authenticateToken);

router.post("/event/add", authorizeAdmin, addEvent);
router.post("/event/:event/create", authorizeAdmin, createEvent);
router.patch("/event/:event/edit", authorizeAdmin, editEvent);
router.post("/request/:event/approve", authorizeAdmin, approveRequest);

router.get("/events", authorizeAdmin, getEvents);
router.get("/event-requests", authorizeAdmin, getEventRequests);
router.get("/notifications", authorizeAdmin, getNotifications);

export default router;
