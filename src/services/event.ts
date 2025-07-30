import { AppDataSource } from "../config/db";
import { Event } from "../entities/event";
import {
  AddEventDts,
  ApproveRequestDts,
  EditEventDts,
  PaymentDetails,
} from "../types/event";
import { generateSlug } from "../utils/slugify";
import { EventParticipant } from "../entities/eventParticipant";
import { EventType, MemberRole, PaymentStatus } from "../constants/enums";
import { sendInvite } from "../utils/sendMail";
import { InviteToken } from "../entities/inviteToken";
import { nanoid } from "nanoid";
import { EventRequest } from "../entities/eventRequest";
import userService from "./user";
import { Notification } from "../entities/notifications";
import { getIO } from "../config/socket";

const RequestRepository = AppDataSource.getRepository(EventRequest);
const NotificationRepository = AppDataSource.getRepository(Notification);
const EventRepository = AppDataSource.getRepository(Event);
const InviteTokenRepository = AppDataSource.getRepository(InviteToken);
const EventParticipantRepository =
  AppDataSource.getRepository(EventParticipant);

const eventService = {
  addEvent: async (event: AddEventDts) => {
    const slug = generateSlug(event.eventDetails.clientName);

    const depositAmount = Math.floor(
      event.paymentDetails.totalAmount - event.paymentDetails.pendingAmount
    );

    const newEvent = EventRepository.create({
      eventType: event.eventDetails.eventType,
      clientName: event.eventDetails.clientName,
      phoneNumber: event.eventDetails.phoneNumber,
      pickupDate: event.eventDetails.pickupDate,
      location: event.eventDetails.location,
      vehicle: event.vehicleInfo.vehicleName,
      passengerCount: event.vehicleInfo.numberOfPassengers,
      hoursReserved: event.vehicleInfo.hoursReserved,
      totalAmount: event.paymentDetails.totalAmount,
      pendingAmount: event.paymentDetails.pendingAmount,
      depositAmount: depositAmount,
      equityDivision: event.paymentDetails.equityDivision,
      slug: slug,
    });

    await EventRepository.save(newEvent);

    return { message: "success", data: newEvent };
  },

  createEvent: async (host: string, cohosts: string[], event: string) => {
    const eventFound = await EventRepository.findOne({
      where: { slug: event },
    });

    if (!eventFound) {
      throw new Error("Event not Found!");
    }

    eventFound.host = host;
    eventFound.cohosts = cohosts;

    await EventRepository.save(eventFound);

    const cohostParticipants = cohosts.map((user) =>
      EventParticipantRepository.create({
        email: user,
        event: eventFound,
        equityAmount: Math.floor(
          eventFound.pendingAmount / eventFound.equityDivision
        ),
        paymentStatus: PaymentStatus.PENDING,
        role: MemberRole.COHOST,
      })
    );

    await EventParticipantRepository.save([...cohostParticipants]);

    const inviteToken = nanoid(10);
    const expiryDays = Number(process.env.INVITE_EXPIRY) || 3;

    const tokenGenerated = InviteTokenRepository.create({
      inviteToken: inviteToken,
      hostEmail: host,
      eventSlug: eventFound.slug,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    });

    await InviteTokenRepository.save(tokenGenerated);

    await sendInvite(host, `${process.env.CLIENT_URL}/${inviteToken}`);

    const message = `A New Event (${eventFound.slug}) has been created.`;

    getIO().to(`event_${eventFound.slug}`).emit("new_event", {
      message: message,
      slug: eventFound.slug,
      id: eventFound.id,
      createdAt: eventFound.createdAt,
    });

    const newNotification = NotificationRepository.create({
      title: "New Event",
      description: message,
      type: EventType.MESSAGE,
      read: false,
      event: eventFound,
    });

    await NotificationRepository.save(newNotification);

    return { message: "success", data: {} };
  },

  approveRequest: async (
    paymentDetails: PaymentDetails,
    event: string,
    cohosts: string[]
  ) => {
    const requestFound = await RequestRepository.findOne({
      where: { slug: event },
    });

    if (!requestFound) {
      throw new Error("Request does not exist!");
    }

    const depositAmount = Math.floor(
      paymentDetails.totalAmount - paymentDetails.pendingAmount
    );

    const newEvent = EventRepository.create({
      eventType: requestFound.eventType,
      clientName: requestFound.clientName,
      phoneNumber: requestFound.phoneNumber,
      pickupDate: requestFound.pickupDate,
      location: requestFound.location,
      vehicle: requestFound.vehicle,
      passengerCount: requestFound.passengerCount,
      hoursReserved: requestFound.hoursReserved,
      totalAmount: paymentDetails.totalAmount,
      pendingAmount: paymentDetails.pendingAmount,
      depositAmount: depositAmount,
      equityDivision: paymentDetails.equityDivision,
      slug: requestFound.slug,
    });

    await EventRepository.save(newEvent);

    const cohostParticipants = cohosts.map((user) =>
      EventParticipantRepository.create({
        email: user,
        event: newEvent,
        equityAmount: Math.floor(
          newEvent.pendingAmount / newEvent.equityDivision
        ),
        paymentStatus: PaymentStatus.PENDING,
        role: MemberRole.COHOST,
      })
    );

    await EventParticipantRepository.save([...cohostParticipants]);

    await eventService.createEvent(requestFound.createdBy, cohosts, event);

    await RequestRepository.softDelete({ slug: event });

    return { message: "success", data: newEvent };
  },

  editEvent: async (eventObject: EditEventDts) => {
    const eventFound = await EventRepository.findOne({
      where: { slug: eventObject.event },
    });

    if (!eventFound) {
      throw new Error("Event not Found!");
    }

    const now = new Date();
    const createdAt = new Date(eventFound.createdAt);
    const launchBuffer = Number(process.env.PRE_LAUNCH_PERIOD) || 24;
    const isWithinLaunchPeriod =
      now < new Date(createdAt.getTime() + launchBuffer * 60 * 60 * 1000);

    if (!isWithinLaunchPeriod) {
      throw new Error("Event has already been locked. You can't proceed.");
    }

    const depositAmount = Math.floor(
      eventObject.paymentDetails.totalAmount -
        eventObject.paymentDetails.pendingAmount
    );

    eventFound.eventType = eventObject.eventDetails.eventType;
    eventFound.clientName = eventObject.eventDetails.clientName;
    eventFound.phoneNumber = eventObject.eventDetails.phoneNumber;
    eventFound.pickupDate = eventObject.eventDetails.pickupDate;
    eventFound.location = eventObject.eventDetails.location;
    eventFound.vehicle = eventObject.vehicleInfo.vehicleName;
    eventFound.passengerCount = eventObject.vehicleInfo.numberOfPassengers;
    eventFound.hoursReserved = eventObject.vehicleInfo.hoursReserved;
    eventFound.totalAmount = eventObject.paymentDetails.totalAmount;
    eventFound.pendingAmount = eventObject.paymentDetails.pendingAmount;
    eventFound.depositAmount = depositAmount;
    eventFound.equityDivision = eventObject.paymentDetails.equityDivision;

    const newEvent = await EventRepository.save(eventFound);

    const message = `The Event (${newEvent.slug}) has been updated.`;

    getIO().to(`event_${newEvent.slug}`).emit("update_event", {
      message: message,
      slug: newEvent.slug,
      id: newEvent.id,
      createdAt: newEvent.createdAt,
    });

    const newNotification = NotificationRepository.create({
      title: "Event Updated",
      description: message,
      type: EventType.UPDATE,
      read: false,
      event: newEvent,
    });

    await NotificationRepository.save(newNotification);

    return { message: "success", data: newEvent };
  },

  editRequest: async (eventObject: EditEventDts) => {
    const eventFound = await RequestRepository.findOne({
      where: { slug: eventObject.event },
    });

    if (!eventFound) {
      throw new Error("Event not Found!");
    }

    eventFound.eventType = eventObject.eventDetails.eventType;
    eventFound.clientName = eventObject.eventDetails.clientName;
    eventFound.phoneNumber = eventObject.eventDetails.phoneNumber;
    eventFound.pickupDate = eventObject.eventDetails.pickupDate;
    eventFound.location = eventObject.eventDetails.location;
    eventFound.vehicle = eventObject.vehicleInfo.vehicleName;
    eventFound.passengerCount = eventObject.vehicleInfo.numberOfPassengers;
    eventFound.hoursReserved = eventObject.vehicleInfo.hoursReserved;

    const newEvent = await RequestRepository.save(eventFound);

    const message = `The Request (${newEvent.slug}) has been updated.`;

    getIO().to(`event_${newEvent.slug}`).emit("update_request", {
      message: message,
      slug: newEvent.slug,
      id: newEvent.id,
      createdAt: newEvent.createdAt,
    });

    const newNotification = NotificationRepository.create({
      title: "Request Updated",
      description: message,
      type: EventType.UPDATE,
      read: false,
      event: newEvent,
    });

    await NotificationRepository.save(newNotification);

    return { message: "success", data: newEvent };
  },

  getEvents: async ({
    user,
    page = 1,
    limit = 10,
  }: {
    user?: string;
    page?: number;
    limit?: number;
  }) => {
    if (user) {
      await userService.findUserWithEmail(user);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await EventRepository.findAndCount({
      where: user ? { participants: { email: user } } : {},
      relations: ["participants"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return {
      message: "sucess",
      data: { total: total, page: page, limit: limit, events: events },
    };
  },

  getNotifications: async ({
    user,
    page = 1,
    limit = 10,
  }: {
    user: string;
    page?: number;
    limit?: number;
  }) => {
    await userService.findUserWithEmail(user);

    const skip = (page - 1) * limit;

    const [notifications, total] = await NotificationRepository.findAndCount({
      where: user ? { user: { email: user } } : {},
      relations: ["triggeredBy", "event"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return {
      message: "sucess",
      data: {
        total: total,
        page: page,
        limit: limit,
        notifications: notifications,
      },
    };
  },

  getEventRequests: async ({
    user,
    page = 1,
    limit = 10,
  }: {
    user?: string;
    page?: number;
    limit?: number;
  }) => {
    const skip = (page - 1) * limit;

    if (user) {
      await userService.findUserWithEmail(user);
    }

    const [requests, total] = await RequestRepository.findAndCount({
      where: user ? { createdBy: user } : {},
      relations: ["participants"],
      order: {
        createdAt: "DESC",
      },
      skip,
      take: limit,
    });

    return {
      message: "sucess",
      data: {
        total: total,
        page: page,
        limit: limit,
        requests: requests,
      },
    };
  },
};

export default eventService;
