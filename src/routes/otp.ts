import { Router } from "express";
import { requestOTP, verifyOTP } from "../controllers/otp";

const router = Router();

router.post("/request", requestOTP);
router.post("/verify", verifyOTP);

export default router;
