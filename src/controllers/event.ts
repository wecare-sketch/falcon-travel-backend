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
import userService from "../services/user";

export const addEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventDetails, vehicleInfo, paymentDetails } =
      req.body as AddEventDts;
    const result = await eventService.addEvent(
      {
        eventDetails,
        vehicleInfo,
        paymentDetails,
      },
      req
    );
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

    const result = await eventService.editEvent(event, {
      eventDetails,
      vehicleInfo,
      paymentDetails,
    });
    return res.json(result);
  }
);

export const editRequest = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { eventDetails, vehicleInfo } = req.body as EditEventDts;

    const { event } = req.params;

    const result = await eventService.editRequest({
      eventDetails,
      vehicleInfo,
      event,
    });
    return res.json(result);
  }
);

export const getEventMedia = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const userId = req.query.userId as string | undefined;
    const { event } = req.params;

    const eventId = event;

    const result = await userService.getAllMediaFromEvent({
      userId,
      page,
      limit,
      eventId,
    });

    return res.json(result);
  }
);

export const getEventRequests = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const userId = req.query.userId as string | undefined;
    const requestId = req.query.requestId as string | undefined;

    const result = await eventService.getEventRequests({
      userId,
      page,
      limit,
      requestId,
    });

    return res.json(result);
  }
);

export const deleteEvent = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { event } = req.params;

    const result = await eventService.deleteEvent(event);
    return res.json(result);
  }
);

export const deleteRequest = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { request } = req.params;

    const result = await eventService.deleteRequest(request);
    return res.json(result);
  }
);

export const getEvents = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const userId = req.query.userId as string | undefined;
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
