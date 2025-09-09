import { AppDataSource } from "../config/db";
import { Event } from "../entities/event";
import {
  AddEventDts,
  EditEventDts,
  EditRequestDts,
  PaymentDetails,
  SharedEventResponse,
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
import { In, Transaction } from "typeorm";
import { InvoicePayload, ParticipantInvoice } from "../types/payment";
import paymentService from "./payment";

const RequestRepository = AppDataSource.getRepository(EventRequest);
const NotificationRepository = AppDataSource.getRepository(Notification);
const EventRepository = AppDataSource.getRepository(Event);
const InviteTokenRepository = AppDataSource.getRepository(InviteToken);
const EventParticipantRepository =
  AppDataSource.getRepository(EventParticipant);
const TransactionRepository = AppDataSource.getRepository(Transaction);

const UserRepository = AppDataSource.getRepository(User);

const eventService = {
  addEvent: async (event: AddEventDts, req: AuthenticatedRequest) => {
    if (
      event.paymentDetails.equityDivision < 0 ||
      event.paymentDetails.totalAmount < 0 ||
      event.paymentDetails.pendingAmount < 0
    )
      throw new Error("amount cannot be less than 0");

    if (event.paymentDetails.totalAmount < event.paymentDetails.pendingAmount)
      throw new Error("Invalid payment values");

    const depositAmount = Math.floor(
      event.paymentDetails.totalAmount - event.paymentDetails.pendingAmount
    );

    if (depositAmount < 0) {
      throw new Error("Invalid amount entered");
    }

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

    const updatedStatus =
      event.paymentDetails.pendingAmount === 0
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING;

    const newEvent = EventRepository.create({
      imageUrl: imageUrl[0],
      name: event.eventDetails.name,
      eventType: event.eventDetails.eventType,
      paymentStatus: updatedStatus,
      clientName: event.eventDetails.clientName,
      phoneNumber: event.eventDetails.phoneNumber,
      pickupDate: event.eventDetails.pickupDate,
      location: event.eventDetails.location,
      stops: event.eventDetails.stops,
      vehicle: event.vehicleInfo.vehicleName,
      passengerCount: event.vehicleInfo.numberOfPassengers,
      hoursReserved: event.vehicleInfo.hoursReserved,
      totalAmount: event.paymentDetails.totalAmount,
      pendingAmount: event.paymentDetails.pendingAmount,
      initialEquity: event.paymentDetails.pendingAmount,
      depositAmount: depositAmount,
      equityDivision: event.paymentDetails.equityDivision,
      tripNotes: event.tripNotes,
      slug: slug,
    });

    await EventRepository.save(newEvent);

    return { message: "success", data: newEvent };
  },

  createEvent: async (host: string, cohosts: string[], event: string) => {
    // console.log("slug", event);
    console.log(
      "event",
      await EventRepository.findOne({
        where: { slug: event },
      })
    );
    const eventFound = await EventRepository.findOne({
      where: {
        slug: event,
        eventStatus: In([
          EventStatus.PENDING,
          EventStatus.FINISHED,
          EventStatus.EXPIRED,
          EventStatus.CREATED,
          EventStatus.STARTED,
          EventStatus.DISCREPANCY,
        ]),
      },
    });

    if (!eventFound) {
      throw new Error("Event not Found!");
    }

    eventFound.host = host;
    eventFound.cohosts = cohosts;

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
    // const expiryDays = Number(process.env.INVITE_EXPIRY) || 3;

    const tokenGenerated = InviteTokenRepository.create({
      inviteToken: inviteToken,
      hostEmail: host,
      event: eventFound,
      // expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    });

    await InviteTokenRepository.save(tokenGenerated);

    await sendInvite(host, `${process.env.CLIENT_URL}/${inviteToken}`);

    eventFound.eventStatus = EventStatus.CREATED;

    await EventRepository.save(eventFound);

    return {
      message: "success",
      data: { url: `${process.env.CLIENT_URL}/${inviteToken}` },
    };
  },

  sendInviteToHost: async (eventSlug: string) => {
    const invite = await InviteTokenRepository.findOne({
      where: { event: { slug: eventSlug } },
    });

    if (!invite) {
      throw new Error("Invite not found!");
    }

    sendInvite(
      invite.hostEmail,
      `${process.env.CLIENT_URL}/${invite?.inviteToken}`
    );

    return {
      message: "success",
      data: { url: `${process.env.CLIENT_URL}/${invite?.inviteToken}` },
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

    if (
      paymentDetails.equityDivision < 0 ||
      paymentDetails.totalAmount < 0 ||
      paymentDetails.pendingAmount < 0
    )
      throw new Error("amount cannot be less than 0");

    if (paymentDetails.totalAmount < paymentDetails.pendingAmount)
      throw new Error("Invalid payment values");

    const depositAmount = Math.floor(
      paymentDetails.totalAmount - paymentDetails.pendingAmount
    );

    if (depositAmount < 0) {
      throw new Error("Invalid amount entered");
    }

    const updatedStatus =
      paymentDetails.pendingAmount === 0
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING;

    const newEvent = EventRepository.create({
      name: requestFound.name,
      eventType: requestFound.eventType,
      clientName: requestFound.clientName,
      paymentStatus: updatedStatus,
      phoneNumber: requestFound.phoneNumber,
      pickupDate: requestFound.pickupDate,
      location: requestFound.location,
      stops: requestFound.stops,
      vehicle: requestFound.vehicle,
      passengerCount: requestFound.passengerCount,
      hoursReserved: requestFound.hoursReserved,
      totalAmount: paymentDetails.totalAmount,
      pendingAmount: paymentDetails.pendingAmount,
      initialEquity: paymentDetails.pendingAmount,
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

    if (
      eventObject.paymentDetails.equityDivision < 0 ||
      eventObject.paymentDetails.totalAmount < 0 ||
      eventObject.paymentDetails.pendingAmount < 0
    )
      throw new Error("amount cannot be less than 0");

    const depositAmount = Math.floor(
      eventObject.paymentDetails.totalAmount -
        eventObject.paymentDetails.pendingAmount
    );

    if (depositAmount < 0) {
      throw new Error("Invalid amount entered");
    }

    const now = new Date();
    const createdAt = new Date(eventFound.createdAt);
    const launchBuffer = Number(process.env.PRE_LAUNCH_PERIOD) || 24;
    const isWithinLaunchPeriod =
      now < new Date(createdAt.getTime() + launchBuffer * 60 * 60 * 1000);

    if (!isWithinLaunchPeriod) {
      throw new Error("Event has already been locked. You can't proceed.");
    }

    await eventService.checkAndUpdatePaymentInfo(eventObject, eventFound);

    eventFound.name = eventObject.eventDetails.name;
    eventFound.eventType = eventObject.eventDetails.eventType;
    eventFound.clientName = eventObject.eventDetails.clientName;
    eventFound.phoneNumber = eventObject.eventDetails.phoneNumber;
    eventFound.pickupDate = eventObject.eventDetails.pickupDate;
    eventFound.location = eventObject.eventDetails.location;
    eventFound.vehicle = eventObject.vehicleInfo.vehicleName;
    eventFound.passengerCount = eventObject.vehicleInfo.numberOfPassengers;
    eventFound.hoursReserved = eventObject.vehicleInfo.hoursReserved;
    eventFound.initialEquity = eventObject.paymentDetails.pendingAmount;
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

  checkAndUpdatePaymentInfo: async (eventObject: AddEventDts, event: Event) => {
    const { totalAmount, pendingAmount, equityDivision } =
      eventObject.paymentDetails;

    const changed =
      totalAmount !== event.totalAmount ||
      pendingAmount !== event.pendingAmount ||
      equityDivision !== event.equityDivision;

    if (!changed) return;

    if (!Number.isInteger(totalAmount) || !Number.isInteger(pendingAmount)) {
      throw new Error("Amounts must be whole dollars (integers).");
    }
    if (!Number.isInteger(equityDivision) || equityDivision <= 0) {
      throw new Error("equityDivision must be a positive integer.");
    }

    const depositAmount = Math.floor(
      eventObject.paymentDetails.totalAmount -
        eventObject.paymentDetails.pendingAmount
    );

    const newEquity = Math.floor(pendingAmount / equityDivision);

    const participants = await eventService.getPendingParticipants(event.slug);

    for (const p of participants) {
      const isHost =
        p.role === MemberRole.HOST ||
        (!!event.host && p.email?.toLowerCase() === event.host.toLowerCase());

      p.equityAmount = isHost ? depositAmount : newEquity;
    }

    if (participants.length) {
      await EventParticipantRepository.save(participants);
    }
  },

  editRequest: async (eventObject: EditRequestDts) => {
    const requestFound = await RequestRepository.findOne({
      where: { slug: eventObject.request },
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
    requestFound.tripNotes = eventObject.tripNotes;
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
    search,
    paymentStatus,
    host,
    isAdmin = false,
  }: {
    userId?: string;
    page?: number;
    limit?: number;
    eventId?: string;
    search?: string;
    paymentStatus?: PaymentStatus;
    host?: string;
    isAdmin?: boolean;
  }) => {
    if (eventId) {
      const event = await EventRepository.findOne({
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

      const updatedEvent = await eventService.checkAndUpdateEventExpiry(event);

      return { message: "success", data: { event: updatedEvent } };
    }

    const query = EventRepository.createQueryBuilder("event")
      .leftJoinAndSelect("event.feedbacks", "feedbacks")
      .orderBy("event.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (!isAdmin && userId) {
      query
        .innerJoin("event.participants", "participants")
        .innerJoin("participants.user", "user")
        .andWhere("user.id = :userId", { userId });
    }

    if (isAdmin) {
      if (host) {
        query.andWhere("event.host ILIKE :host", { host: `%${host}%` });
      }
      if (paymentStatus) {
        query.andWhere("event.paymentStatus = :paymentStatus", {
          paymentStatus,
        });
      }
    }

    if (search) {
      query.andWhere(
        "(event.name ILIKE :search OR event.clientName ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [events, total] = await query.getManyAndCount();

    const updatedEvents = await Promise.all(
      events.map(eventService.checkAndUpdateEventExpiry)
    );

    return {
      message: "success",
      data: { total, page, limit, events: updatedEvents },
    };
  },

  getSharedEvent: async ({ slug }: { slug: string }) => {
    const event = await EventRepository.createQueryBuilder("event")
      .leftJoinAndSelect("event.messages", "messages")
      .where("event.slug = :slug", { slug })
      .select([
        "event.slug",
        "event.eventStatus",
        "event.pickupDate",
        "event.host",
        "event.location",
        "event.stops",
        "event.vehicle",
        "event.passengerCount",
        "event.expiresAt",
        "messages.message",
        "event.tripNotes",
      ])
      .getOne();

    if (!event) {
      throw new Error("Event not found!");
    }

    const updatedEvent = await eventService.checkAndUpdateEventExpiry(event);

    const user = await UserRepository.findOne({
      where: { email: updatedEvent.host },
    });

    const msgs = updatedEvent.tripNotes ?? "";

    const additionalData: SharedEventResponse = {
      trip_id: updatedEvent.slug,
      status: updatedEvent.eventStatus,
      ETA: updatedEvent.pickupDate,

      passengerInfo: {
        name: user?.fullName ?? "",
        phone: user?.phoneNumber ?? "",
      },

      routeDetails: {
        location: updatedEvent.location,
        route: updatedEvent.stops ?? [],
      },

      vehicleInfo: {
        name: updatedEvent.vehicle,
        passengerCount: updatedEvent.passengerCount,
        hoursLocked: updatedEvent.expiresAt!,
      },

      tripNotes: msgs,
    };

    return { message: "success", data: additionalData };
  },

  getInvoice: async ({
    userId,
    eventSlug,
    isAdmin,
    lastOnly = false, // if true, show only the most recent payment per participant
  }: {
    userId?: string;
    eventSlug: string;
    isAdmin: boolean;
    lastOnly?: boolean;
  }): Promise<{ message: "success"; data: InvoicePayload }> => {
    // 1) Load the event with participants
    const eventRecord = await EventRepository.findOne({
      where: { slug: eventSlug },
      relations: ["participants", "participants.user"],
    });
    if (!eventRecord) throw new Error("Event not found!");

    // 2) Prepare the base payload (event header + totals)
    const totalParticipants = eventRecord.participants?.length ?? 0;
    const participantsPaidCount = (eventRecord.participants || []).filter(
      (p) => p.paymentStatus === PaymentStatus.PAID
    ).length;

    const basePayload: InvoicePayload = {
      event: {
        slug: eventRecord.slug,
        name: eventRecord.name,
        clientName: eventRecord.clientName,
        phoneNumber: eventRecord.phoneNumber,
        pickupDate: eventRecord.pickupDate,
        location: eventRecord.location,
        vehicle: eventRecord.vehicle,
        hoursReserved: eventRecord.hoursReserved,
        host: eventRecord.host ?? undefined,
      },
      participants: [],
      totals: {
        totalAmount: eventRecord.totalAmount,
        depositAmount: eventRecord.totalAmount - eventRecord.pendingAmount,
        pendingAmount: Math.max(0, eventRecord.pendingAmount),
        participantCount: totalParticipants,
        participantsPaidCount,
        participantsPendingCount: Math.max(
          0,
          totalParticipants - participantsPaidCount
        ),
      },
    };

    // 3) Decide what scope of data the caller is allowed to see
    //    - "ALL" means every participant
    //    - an array of emails means only those users (participant self)
    let visibleEmails: "ALL" | string[] = "ALL";

    if (!isAdmin) {
      if (!userId) {
        const err: any = new Error("Unauthorized");
        err.status = 401;
        throw err;
      }

      const requestingUser = await userService.findUserWithId(userId);
      const isHost =
        !!eventRecord.host && eventRecord.host === requestingUser.email;
      const isParticipant = (eventRecord.participants || []).some(
        (p) => p.email === requestingUser.email
      );

      if (isHost) {
        // Host can view full invoice only after first event payment
        const eventHasAnyPayment =
          eventRecord.totalAmount - eventRecord.pendingAmount >= 0;
        if (!eventHasAnyPayment) {
          const err: any = new Error(
            "Invoice will be available after the first payment."
          );
          err.status = 403;
          throw err;
        }
        visibleEmails = "ALL";
      } else if (isParticipant) {
        // Participant can view only their own invoice and only after they have paid something
        const selfParticipant = (eventRecord.participants || []).find(
          (p) => p.email === requestingUser.email
        );

        const userHasPaidSomething =
          !!selfParticipant && (selfParticipant.depositedAmount ?? 0) > 0;
        if (!userHasPaidSomething) {
          const err: any = new Error(
            "Your invoice will be available after you make a payment."
          );
          err.status = 403;
          throw err;
        }
        visibleEmails = [requestingUser.email];
      } else {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
      }
    }

    // 4) Collect all payments once, grouped by email
    const paymentsGroupedByEmail =
      await paymentService.getPaymentsByEmailForEvent(eventRecord.id);

    // 5) Pick which participants to include based on visibility
    const participantsToRender =
      visibleEmails === "ALL"
        ? eventRecord.participants || []
        : (eventRecord.participants || []).filter((p) =>
            visibleEmails.includes(p.email)
          );

    // 6) Build each participant block
    basePayload.participants = participantsToRender.map((participant) => {
      let payments = paymentsGroupedByEmail.get(participant.email) || [];
      if (lastOnly && payments.length) payments = [payments[0]]; // keep only most recent if requested

      const remainingAmount = Math.max(
        0,
        participant.equityAmount - participant.depositedAmount
      );

      const participantBlock: ParticipantInvoice = {
        email: participant.email,
        role: participant.role,
        equityAmount: participant.equityAmount,
        depositedAmount: participant.depositedAmount,
        remainingAmount,
        paymentStatus: participant.paymentStatus,
        payments,
      };

      return participantBlock;
    });

    return { message: "success", data: basePayload };
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

  getPendingParticipants: async (slug: string): Promise<EventParticipant[]> => {
    return await EventParticipantRepository.find({
      where: { event: { slug }, paymentStatus: PaymentStatus.PENDING },
      order: { id: "ASC" },
    });
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
