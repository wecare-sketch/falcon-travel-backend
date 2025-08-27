import { Router } from "express";
import { handleWebhook, payThruStripe } from "../controllers/payment";
import { authenticateToken } from "../middlewares/auth";

const router = Router();
router.use(authenticateToken);
router.post("/stripe", payThruStripe);

export default router;
