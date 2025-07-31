import { Router } from "express";
import { handleWebhook } from "../controllers/payment";

const router = Router();

router.post("/stripe", handleWebhook);

export default router;
