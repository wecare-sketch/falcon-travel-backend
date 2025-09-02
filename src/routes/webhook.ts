import { Router } from "express";
import { handleWebhook } from "../controllers/payment";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// Stripe webhook should not require authentication
router.post("/stripe", handleWebhook);

// If you have other webhook routes that need authentication, apply it individually
// router.post("/other-webhook", authenticateToken, otherWebhookHandler);

export default router;
