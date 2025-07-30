import { Router } from "express";
import { requestOTP, verifyOTP } from "../controllers/otp";

const router = Router();

router.get("/request", requestOTP);
router.post("/verify", verifyOTP);

export default router;
