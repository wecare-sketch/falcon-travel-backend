import express from "express";
import { getSharedEvent } from "../controllers/event";

const router = express.Router();

router.get("/shared/:event", getSharedEvent);

export default router;
