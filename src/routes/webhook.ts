import { Router } from "express";
import { handleWebhook } from "../controllers/payment";
import { authenticateToken } from "../middlewares/auth";

const router = Router();
router.use(authenticateToken);
router.post("/stripe", handleWebhook);

export default router;
