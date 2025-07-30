import { Router } from "express";
import {
  register,
  login,
  registerWithGoogle,
  registerWithApple,
  loginWithGoogle,
  loginWithApple,
} from "../controllers/auth";

const router = Router();

router.post("/register/:token", register);

router.post("/social/google/signup/:token", registerWithGoogle);
router.post("/social/apple/signup/:token", registerWithApple);

router.post("/login", login);
router.post("/social/google/login", loginWithGoogle);
router.post("/social/apple/login", loginWithApple);

export default router;
