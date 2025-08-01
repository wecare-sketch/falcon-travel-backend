import { Response } from "express";
import { errorHandler } from "../utils/errorHandler";
import userService from "../services/user";
import { AuthenticatedRequest } from "../types/request";
import { RequestEventDts } from "../types/event";
import eventService from "../services/event";

export const addDetails = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { fullName, dob, phone } = req.body;

    const result = await userService.addUserDetails(
      fullName,
      dob,
      phone,
      user.email
    );
    return res.json(result);
  }
);

export const addMessage = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { message } = req.body;

    const { event } = req.params;

    const result = await userService.addPersonalMessage(
      user.email,
      event,
      message
    );
    return res.json(result);
  }
);

export const submitFeedback = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { Q1, Q2, Q3, Q4, Q5, avg, description } = req.body;

    const { event } = req.params;

    const result = await userService.submitFeedback(
      event,
      { Q1, Q2, Q3, Q4, Q5 },
      { avg, description },
      user.email
    );
    return res.json(result);
  }
);

export const joinEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    const { event } = req.params;

    const result = await userService.joinEvent(user.email, event);
    return res.json(result);
  }
);

export const requestEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { eventDetails, vehicleInfo, cohosts } = req.body as RequestEventDts;
    const result = await userService.requestEvent(
      {
        eventDetails,
        vehicleInfo,
        cohosts,
      },
      user.email,
      req
    );

    return res.json(result);
  }
);

export const getEvents = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const userId = user.id as string;

    const eventId = req.query.eventId as string | undefined;

    const result = await eventService.getEvents({
      userId,
      page,
      limit,
      eventId,
    });
    return res.json(result);
  }
);

export const getNotifications = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const userId = user.id;

    const result = await eventService.getNotifications({
      userId,
      page,
      limit,
    });
    return res.json(result);
  }
);

export const resetPassword = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { newPassword } = req.body;
    const user = req.user;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const result = await userService.resetPassword(newPassword, user);
    return res.json(result);
  }
);

export const uploadMedia = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { event } = req.params;

    const result = await userService.uploadMedia(user.email, event, req);
    return res.json(result);
  }
);
