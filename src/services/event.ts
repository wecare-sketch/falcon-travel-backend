import { AppDataSource } from "../config/db";
import { Event } from "../entities/event";
import {
  AddEventDts,
  EditEventDts,
  EditRequestDts,
  PaymentDetails,
} from "../types/event";
import { generateSlug } from "../utils/slugify";
import { EventParticipant } from "../entities/eventParticipant";
import {
  EventStatus,
  EventType,
  MemberRole,
  notificationType,
  PaymentStatus,
} from "../constants/enums";
import { sendInvite } from "../utils/sendMail";
import { InviteToken } from "../entities/inviteToken";
import { nanoid } from "nanoid";
import { EventRequest } from "../entities/eventRequest";
import userService from "./user";
import { Notification } from "../entities/notifications";
import { User } from "../entities/user";
import notificationService from "./notification";
import { NotificationInputDts } from "../types/notification";
import { AuthenticatedRequest } from "../types/request";
import { mediaHandler } from "../utils/mediaHandler";

const RequestRepository = AppDataSource.getRepository(EventRequest);
const NotificationRepository = AppDataSource.getRepository(Notification);
const EventRepository = AppDataSource.getRepository(Event);
const InviteTokenRepository = AppDataSource.getRepository(InviteToken);
const EventParticipantRepository =
  AppDataSource.getRepository(EventParticipant);

const UserRepository = AppDataSource.getRepository(User);

const eventService = {
  addEvent: async (event: AddEventDts, req: AuthenticatedRequest) => {
    const slug = generateSlug(event.eventDetails.clientName);

    const imageUrl = await mediaHandler(
      req,
      event.eventDetails.clientName,
      slug,
      {
        folder: `events/${slug}/main`,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      }
    );

    const depositAmount = Math.floor(
      event.paymentDetails.totalAmount - event.paymentDetails.pendingAmount
    );

    const newEvent = EventRepository.create({
      imageUrl: imageUrl[0],
      name: event.eventDetails.name,
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
    eventFound.eventStatus = EventStatus.CREATED;

    eventFound.expiresAt = new Date(
      new Date(eventFound.pickupDate).getTime() +
        eventFound.hoursReserved * 60 * 60 * 1000
    );

    await EventRepository.save(eventFound);

    if (Array.isArray(cohosts) && cohosts.length) {
      const cohostParticipants = cohosts.map((email) =>
        EventParticipantRepository.create({
          email: email,
          event: eventFound,
          equityAmount: Math.floor(
            eventFound.pendingAmount / eventFound.equityDivision
          ),
          paymentStatus: PaymentStatus.PENDING,
          role: MemberRole.COHOST,
        })
      );

      await EventParticipantRepository.save([...cohostParticipants]);
    }

    const inviteToken = nanoid(10);
    const expiryDays = Number(process.env.INVITE_EXPIRY) || 3;

    const tokenGenerated = InviteTokenRepository.create({
      inviteToken: inviteToken,
      hostEmail: host,
      event: eventFound,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    });

    await InviteTokenRepository.save(tokenGenerated);

    await sendInvite(host, `${process.env.CLIENT_URL}/${inviteToken}`);

    return {
      message: "success",
      data: { url: `${process.env.CLIENT_URL}/${inviteToken}` },
    };
  },

  approveRequest: async (paymentDetails: PaymentDetails, event: string) => {
    const requestFound = await RequestRepository.findOne({
      where: { slug: event },
      relations: ["user"],
    });

    if (!requestFound) {
      throw new Error("Request does not exist!");
    }

    const depositAmount = Math.floor(
      paymentDetails.totalAmount - paymentDetails.pendingAmount
    );

    const newEvent = EventRepository.create({
      name: requestFound.name,
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
      imageUrl: requestFound.imageUrl,
    });

    await EventRepository.save(newEvent);

    const notification = {
      emit_event: notificationType.NEW_EVENT,
      message: `A New Event (${newEvent.slug}) has been created.`,
      title: "New Event",
      eventType: EventType.UPDATE,
      request: requestFound,
      metadata: {
        slug: newEvent.slug,
        id: newEvent.id,
        createdAt: newEvent.createdAt,
      },
    } as NotificationInputDts;

    const recipient = requestFound.user;

    await notificationService.send(notification, [recipient]);

    const url = (
      await eventService.createEvent(
        recipient.email,
        requestFound.cohosts || [],
        event
      )
    ).data.url;

    await RequestRepository.softDelete({ slug: event });

    return { message: "success", data: { event: newEvent, url: url } };
  },

  editEvent: async (slug: string, eventObject: AddEventDts) => {
    const eventFound = await EventRepository.findOne({
      where: { slug: slug },
    });

    if (!eventFound) {
      throw new Error("Event not Found!");
    }

    if (
      eventFound.eventStatus !== EventStatus.PENDING &&
      eventFound.eventStatus !== EventStatus.CREATED
    ) {
      throw new Error("This Event cannot be Updated!");
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

    eventFound.name = eventObject.eventDetails.name;
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

    const notification = {
      message: `The Event (${newEvent.slug}) has been updated.`,
      emit_event: notificationType.UPDATE_EVENT,
      title: "Event Updated",
      metadata: {
        slug: newEvent.slug,
        id: newEvent.id,
        createdAt: newEvent.createdAt,
      },
      eventType: EventType.UPDATE,
      event: newEvent,
    } as NotificationInputDts;

    const participants = await eventService.getParticipantsAsUsers(
      newEvent.slug
    );

    if (participants) {
      notificationService.send(notification, participants);
    }

    return { message: "success", data: newEvent };
  },

  editRequest: async (eventObject: EditRequestDts) => {
    const requestFound = await RequestRepository.findOne({
      where: { slug: eventObject.event },
    });

    if (!requestFound) {
      throw new Error("Request was not Found!");
    }

    requestFound.name = eventObject.eventDetails.name;
    requestFound.eventType = eventObject.eventDetails.eventType;
    requestFound.clientName = eventObject.eventDetails.clientName;
    requestFound.phoneNumber = eventObject.eventDetails.phoneNumber;
    requestFound.pickupDate = eventObject.eventDetails.pickupDate;
    requestFound.location = eventObject.eventDetails.location;
    requestFound.vehicle = eventObject.vehicleInfo.vehicleName;
    requestFound.passengerCount = eventObject.vehicleInfo.numberOfPassengers;
    requestFound.hoursReserved = eventObject.vehicleInfo.hoursReserved;
    requestFound.participants = eventObject.participants ?? [
      requestFound.user.email,
    ];

    const newRequest = await RequestRepository.save(requestFound);

    const notification = {
      message: `The Request (${newRequest.slug}) has been updated.`,
      emit_event: notificationType.UPDATE_REQUEST,
      title: "Event Updated",
      metadata: {
        slug: newRequest.slug,
        id: newRequest.id,
        createdAt: newRequest.createdAt,
      },
      eventType: EventType.UPDATE,
      request: newRequest,
    } as NotificationInputDts;

    const recipients = (
      await Promise.all(
        requestFound.participants.map(async (email) => {
          const userFound = await UserRepository.findOne({
            where: { email: email },
          });

          return userFound;
        })
      )
    ).filter((user): user is User => !!user);

    await notificationService.send(notification, recipients);

    return { message: "success", data: newRequest };
  },

  getEvents: async ({
    userId,
    page = 1,
    limit = 10,
    eventId,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
    eventId?: string;
  }) => {
    if (eventId) {
      let event = await EventRepository.findOne({
        where: { id: eventId },
        relations: [
          "participants",
          "feedbacks",
          "media",
          "messages",
          "transactions",
          "participants.user",
        ],
      });

      if (!event) throw new Error("Event not found!");

      event = await eventService.checkAndUpdateEventExpiry(event);

      return { message: "success", data: { event } };
    } else {
      if (userId) {
        await userService.findUserWithId(userId);
      }

      const skip = (page - 1) * limit;

      let [events, total] = await EventRepository.findAndCount({
        where: userId ? { participants: { user: { id: userId } } } : {},
        relations: ["feedbacks"],
        order: { createdAt: "DESC" },
        skip,
        take: limit,
      });

      events = await Promise.all(
        events.map(eventService.checkAndUpdateEventExpiry)
      );

      return {
        message: "success",
        data: { total, page, limit, events },
      };
    }
  },

  getNotifications: async ({
    userId,
    page = 1,
    limit = 10,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
  }) => {
    if (userId) {
      await userService.findUserWithId(userId);
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await NotificationRepository.findAndCount({
      where: userId ? { user: { id: userId } } : {},
      relations: ["event"],
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
    userId,
    page = 1,
    limit = 10,
    requestId,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
    requestId?: string;
  }) => {
    if (requestId) {
      const request = await RequestRepository.findOne({
        where: { id: requestId },
        relations: ["user"],
      });

      if (!request) throw new Error("Request not found!");

      return { message: "success", data: { request: request } };
    } else {
      const skip = (page - 1) * limit;

      if (userId) {
        await userService.findUserWithId(userId);
      }

      const [requests, total] = await RequestRepository.findAndCount({
        where: userId ? { user: { id: userId } } : {},
        order: {
          createdAt: "DESC",
        },
        skip,
        take: limit,
      });

      return {
        message: "success",
        data: {
          total: total,
          page: page,
          limit: limit,
          requests: requests,
        },
      };
    }
  },

  getEventBySlug: async (slug: string) => {
    const event = await EventRepository.findOne({
      where: { slug: slug },
      relations: ["participants", "participants.user"],
    });

    if (!event) throw new Error("Event not found!");

    return event;
  },

  getParticipantsAsUsers: async (slug: string): Promise<User[]> => {
    const participants = (await eventService.getEventBySlug(slug)).participants;

    const users = participants
      ?.map((p) => {
        return p.user;
      })
      .filter((u): u is User => !!u);

    return users || [];
  },

  checkAndUpdateEventExpiry: async (event: Event) => {
    const now = new Date();

    if (
      event.eventStatus === EventStatus.PENDING &&
      new Date(event.pickupDate) < now
    ) {
      event.eventStatus = EventStatus.STARTED;
      await EventRepository.save(event);
    }

    if (event.eventStatus === EventStatus.PENDING && event.expiresAt! < now) {
      event.eventStatus = EventStatus.EXPIRED;
      await EventRepository.save(event);
    }
    return event;
  },

  deleteEvent: async (eventSlug: string) => {
    const event = await eventService.getEventBySlug(eventSlug);

    if (
      event.eventStatus === EventStatus.STARTED ||
      event.eventStatus === EventStatus.FINISHED
    ) {
      throw new Error("Cannot Delete this Event!");
    }

    await EventRepository.delete({ slug: event.slug });

    return { message: "success", data: {} };
  },

  deleteRequest: async (requestSlug: string) => {
    const request = await RequestRepository.findOne({
      where: { slug: requestSlug },
    });

    if (!request) {
      throw new Error("Request does not exist!");
    }

    await RequestRepository.delete({ slug: request.slug });

    return { message: "success", data: {} };
  },
};

export default eventService;
