import { Router } from "express";
import { payThruStripe } from "../controllers/payment";

const router = Router();

router.post("/stripe", payThruStripe);

export default router;
