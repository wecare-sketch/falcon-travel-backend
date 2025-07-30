import { Request, Response } from "express";
import { errorHandler } from "../utils/errorHandler";
import userService from "../services/user";
import { AuthenticatedRequest } from "../types/request";
import { verifyGoogleToken } from "../utils/googleAuthHandler";
import { verifyAppleToken } from "../utils/appleAuthHandler";

export const login = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    const token =
      typeof req.query.token === "string" ? req.query.token : undefined;

    const result = await userService.loginUser(email, password, token);
    return res.json(result);
  }
);

export const register = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    const { token } = req.params;

    const result = await userService.registerUser(email, password, token);
    return res.json(result);
  }
);

export const registerWithGoogle = errorHandler(
  async (req: Request, res: Response) => {
    const { authToken } = req.body;

    const { token } = req.params;

    const email = await verifyGoogleToken(authToken);
    const result = await userService.registerWithGoogle(email, token);

    return res.json(result);
  }
);

export const registerWithApple = errorHandler(
  async (req: Request, res: Response) => {
    const { authToken } = req.body;

    const { token } = req.params;

    const { sub, email } = await verifyAppleToken(authToken);
    const result = await userService.registerWithApple(
      email ?? `apple-${sub}@anon.apple.com`,
      sub,
      token
    );

    return res.json(result);
  }
);

export const loginWithGoogle = errorHandler(
  async (req: Request, res: Response) => {
    const { authToken } = req.body;

    const token = req.query.token as string | undefined;

    const email = await verifyGoogleToken(authToken);
    const user = await userService.findOAuthUser("google", email);

    return await userService.loginWithOAuth(user, token);
  }
);

export const loginWithApple = errorHandler(
  async (req: Request, res: Response) => {
    const { authToken } = req.body;

    const token = req.query.token as string | undefined;

    const { sub } = await verifyAppleToken(authToken);
    const user = await userService.findOAuthUser("apple", sub);

    return await userService.loginWithOAuth(user, token);
  }
);
