import { Response } from "express";
import { errorHandler } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../types/request";
import otpService from "../services/otp";

export const requestOTP = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    const result = await otpService.requestOTP(email);
    return res.json(result);
  }
);

export const verifyOTP = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, otp } = req.body;

    const result = await otpService.verifyOTP(email, otp);
    return res.json(result);
  }
);
