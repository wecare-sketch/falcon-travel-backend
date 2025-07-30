import { AppDataSource } from "../config/db";
import { User } from "../entities/user";

import { sendOTPMail } from "../utils/sendMail";
import { OTP } from "../entities/otp";
import { generateSecureOTP } from "../utils/generateOtp";
import { LessThan, MoreThan } from "typeorm";
import jwt, { SignOptions } from "jsonwebtoken";
import userService from "./user";

const UserRepository = AppDataSource.getRepository(User);
const OtpRepository = AppDataSource.getRepository(OTP);

const otpService = {
  requestOTP: async (email: string) => {
    const userFound = await userService.findUserWithEmail(email);

    const now = new Date();
    const requestBuffer = Number(process.env.OTP_REQUEST_BUFFER) || 1;
    const resetBuffer = Number(process.env.OTP_RESET_BUFFER) || 2;
    const limit = 5;

    const requestTime = new Date(now.getTime() - requestBuffer * 60 * 1000);
    const recentOtp = await OtpRepository.findOne({
      where: {
        email: userFound.email,
        createdAt: MoreThan(requestTime),
        used: false,
      },
    });
    if (recentOtp) {
      throw new Error(
        `Please wait ${requestBuffer} minute before requesting a new OTP.`
      );
    }

    const resetTime = new Date(now.getTime() - resetBuffer * 60 * 1000);
    const requestCount = await OtpRepository.count({
      where: { email: userFound.email, createdAt: MoreThan(resetTime) },
    });
    if (requestCount >= limit) {
      throw new Error(
        `Too many OTP requests. Try again after ${resetBuffer} minutes.`
      );
    }

    const totalCount = await OtpRepository.count({
      where: { email: userFound.email },
    });

    if (totalCount >= 10) await OtpRepository.delete({ email });

    const expireTime = Number(process.env.INVITE_EXPIRY) || 30;

    const expiry = new Date(Date.now() + expireTime * 60 * 1000);
    const token = generateSecureOTP();

    const otp = OtpRepository.create({
      email: userFound.email,
      token: token,
      expiresAt: expiry,
    });

    await OtpRepository.save(otp);

    await sendOTPMail(userFound.email, otp.token).catch(async (err) => {
      await OtpRepository.delete({ token });
      throw new Error("Failed to send OTP email");
    });

    return { message: "OTP sent", data: { token: token } };
  },

  verifyOTP: async (email: string, otp: string) => {
    const now = new Date();

    const userFound = await UserRepository.findOne({ where: { email: email } });

    if (!userFound) throw new Error("User does not exist!");

    const otpEntry = await OtpRepository.findOne({
      where: {
        email,
        token: otp,
        used: false,
        expiresAt: MoreThan(now),
      },
    });

    if (!otpEntry) {
      throw new Error("Invalid or expired OTP");
    }

    otpEntry.used = true;
    await OtpRepository.save(otpEntry);

    const payload = {
      role: userFound.role,
      email: userFound.email,
      id: userFound.id,
    };

    const expiresIn = process.env.REQUEST_EXPIRY || "5m";

    const token = jwt.sign(
      payload,
      process.env.RESET_SECRET || "MY_SECRET_KEY",
      { expiresIn } as SignOptions
    );

    return { message: "OTP verified successfully", data: { token: token } };
  },
};

export default otpService;
