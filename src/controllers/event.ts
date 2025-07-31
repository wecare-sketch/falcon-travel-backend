import { Response } from "express";
import { errorHandler } from "../utils/errorHandler";
import { AuthenticatedRequest } from "../types/request";
import {
  AddEventDts,
  ApproveRequestDts,
  CreateEventDts,
  EditEventDts,
} from "../types/event";
import eventService from "../services/event";

export const addEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventDetails, vehicleInfo, paymentDetails } =
      req.body as AddEventDts;
    const result = await eventService.addEvent({
      eventDetails,
      vehicleInfo,
      paymentDetails,
    });
    return res.json(result);
  }
);

export const approveRequest = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { totalAmount, pendingAmount, equityDivision } =
      req.body as ApproveRequestDts;
    const { event } = req.params;

    const result = await eventService.approveRequest(
      { totalAmount, pendingAmount, equityDivision },
      event
    );
    return res.json(result);
  }
);

export const createEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { host, cohosts } = req.body as CreateEventDts;
    const { event } = req.params;
    const result = await eventService.createEvent(host, cohosts, event);
    return res.json(result);
  }
);

export const editEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventDetails, vehicleInfo, paymentDetails } =
      req.body as EditEventDts;

    const { event } = req.params;

    const result = await eventService.editEvent({
      eventDetails,
      vehicleInfo,
      paymentDetails,
      event,
    });
    return res.json(result);
  }
);

export const editRequest = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventDetails, vehicleInfo, paymentDetails } =
      req.body as EditEventDts;

    const { event } = req.params;

    const result = await eventService.editRequest({
      eventDetails,
      vehicleInfo,
      paymentDetails,
      event,
    });
    return res.json(result);
  }
);

export const getEvents = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const user = req.query.user as string | undefined;

    const result = await eventService.getEvents({ user, page, limit });

    return res.json(result);
  }
);

export const getEventRequests = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const user = req.query.user as string | undefined;

    const result = await eventService.getEventRequests({
      user,
      page,
      limit,
    });

    return res.json(result);
  }
);
