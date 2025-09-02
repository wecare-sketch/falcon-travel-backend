import Stripe from "stripe";
import { AppDataSource } from "../config/db";
import { stripe } from "../config/stripe";
import { Transaction } from "../entities/transactions";
import eventService from "./event";
import userService from "./user";
import { NotificationInputDts } from "../types/notification";
import notificationService from "./notification";

import {
  EventStatus,
  notificationType,
  PaymentStatus,
} from "../constants/enums";
import { Event } from "../entities/event";
import { EventParticipant } from "../entities/eventParticipant";

const TransactionRepository = AppDataSource.getRepository(Transaction);
const EventRepository = AppDataSource.getRepository(Event);
const EventParticipantRepository =
  AppDataSource.getRepository(EventParticipant);

const paymentService = {
  payThruStripe: async (amount: number, slug: string, email: string) => {
    if (amount <= 0) {
      throw new Error("Invalid Amount!");
    }

    const user = await userService.findUserWithEmail(email);
    const event = await eventService.getEventBySlug(slug);
    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email: user.email, event: { slug: slug } },
    });

    if (!eventParticipant) {
      throw new Error("Participant does not exist!");
    }

    // if (event.eventStatus !== EventStatus.STARTED) {
    //   throw new Error(`This Event hasn't started yet!`);
    // }

    // const now = new Date(Date.now());
    // const expiryDate = new Date(
    //   new Date(event.updatedAt).getTime() + event.hoursReserved * 60 * 60 * 1000
    // );
    // const hasExpired = now >= expiryDate;

    // if (hasExpired) {
    //   event.eventStatus = EventStatus.EXPIRED;
    //   await EventRepository.save(event);
    //   throw new Error(`This Event has already expired!`);
    // }

    if (event.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Event Already Paid For!");
    }

    if (eventParticipant.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Unable to process this payment");
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: event.name,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.STRIPE_RETURN_URL}`,
      cancel_url: `${process.env.STRIPE_RETURN_URL}`,
    });

    const newTransaction = TransactionRepository.create({
      paymentID: session.id,
      amountIntended: amount,
      currency: "usd",
      status: PaymentStatus.PENDING,
      user,
      event,
    });

    await TransactionRepository.save(newTransaction);

    return {
      message: "success",
      data: { sessionId: session.id },
    };
  },

  updateStatus: async (
    payment: Stripe.PaymentIntent,
    status: PaymentStatus
  ) => {
    const transaction = await TransactionRepository.findOne({
      where: { paymentID: payment.id },
      relations: ["user", "event"], // Load the user and event relationships
    });

    if (!transaction) {
      console.warn(`Transaction Entry not found for paymentID: ${payment.id}`);
      return;
    }

    if (transaction.status === status) {
      console.log(
        `Status for ${payment.id} already '${status}', skipping update.`
      );
      return;
    }

    const payment_method = await stripe.paymentMethods.retrieve(
      payment.payment_method as string
    );

    transaction.status = payment.status;
    // Convert Stripe amount from cents to dollars before storing
    const amountInDollars = Math.round(payment.amount_received / 100);
    console.log(
      `Stripe amount: ${payment.amount_received} cents = $${amountInDollars}`
    );

    // Validate the amount is reasonable (should be between $0.01 and $10,000)
    if (amountInDollars < 0.01 || amountInDollars > 10000) {
      console.error(
        `Invalid amount received: $${amountInDollars} (${payment.amount_received} cents)`
      );
      return;
    }

    transaction.amountReceived = amountInDollars;
    transaction.paymentMethod = payment_method.card?.brand;

    await TransactionRepository.save(transaction);

    if (transaction) {
      if (status === PaymentStatus.DISCREPANCY) {
        const admin = await userService.getAdmin();

        const notification = {
          emit_event: notificationType.PAYMENT,
          title: "Payment Flagged",
          message: `a Payment was flagged for unusual behavior: ${payment.id}`,
          eventType: transaction.event.eventType,
          event: transaction.event,
          user: admin,
          metadata: { user: transaction.user },
        } as NotificationInputDts;

        await notificationService.send(notification, [admin]);
      } else if (status === PaymentStatus.PAID) {
        // Check if user exists before accessing email
        if (!transaction.user || !transaction.user.email) {
          console.error(
            `User or user email not found for transaction: ${payment.id}`
          );
          return;
        }

        // Use eventId from Stripe metadata instead of event.slug
        const eventId = payment.metadata.eventId;
        if (!eventId) {
          console.error(
            `Event ID not found in payment metadata for payment: ${payment.id}`
          );
          return;
        }

        await paymentService.processPayment(
          transaction.user.email,
          transaction.amountReceived || 0,
          eventId // Pass eventId instead of event.slug
        );

        const message = `${transaction.user.email} has paid ${transaction.amountReceived} to the event (${eventId})`;

        const notification = {
          message: message,
          emit_event: notificationType.PAYMENT,
          title: "Incoming Payment",
          eventType: transaction.event.eventType,
          event: transaction.event,

          metadata: {
            slug: transaction.event.slug,
            paidAt: transaction.paidAt,
            paymentID: transaction.paymentID,
          },
        } as NotificationInputDts;

        const users = await eventService.getParticipantsAsUsers(
          transaction.event.slug
        );

        await notificationService.send(notification, users);
        console.log(
          `Status updated to '${status}' for paymentID: ${payment.id}`
        );
      } else {
        console.warn("Event does not exist for Transaction!");
        return;
      }
    }
  },

  processPayment: async (
    email: string,
    amount: number,
    eventIdentifier: string
  ) => {
    console.log(
      `processPayment called with: email=${email}, amount=${amount}, eventIdentifier=${eventIdentifier}`
    );
    console.log(`Amount to be added: $${amount} (should be in dollars)`);

    // Check if eventIdentifier is an eventId (UUID) or eventSlug
    const isEventId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventIdentifier
      );

    let event: Event | null = null;
    let eventParticipant: EventParticipant | null = null;

    if (isEventId) {
      // eventIdentifier is an eventId
      console.log(`Looking up event by ID: ${eventIdentifier}`);
      event = await EventRepository.findOne({ where: { id: eventIdentifier } });
      if (event) {
        console.log(`Event found by ID: ${event.name} (${event.slug})`);
        eventParticipant = await EventParticipantRepository.findOne({
          where: { email: email, event: { id: eventIdentifier } },
        });
        if (eventParticipant) {
          console.log(
            `Participant found by ID lookup: ${eventParticipant.email}`
          );
        } else {
          console.log(`No participant found by ID lookup for email: ${email}`);
        }
      } else {
        console.log(`No event found by ID: ${eventIdentifier}`);
      }
    } else {
      // eventIdentifier is an eventSlug
      console.log(`Looking up event by slug: ${eventIdentifier}`);
      event = await EventRepository.findOne({
        where: { slug: eventIdentifier },
      });
      if (event) {
        console.log(`Event found by slug: ${event.name} (${event.id})`);
        eventParticipant = await EventParticipantRepository.findOne({
          where: { email: email, event: { slug: eventIdentifier } },
        });
        if (eventParticipant) {
          console.log(
            `Participant found by slug lookup: ${eventParticipant.email}`
          );
        } else {
          console.log(
            `No participant found by slug lookup for email: ${email}`
          );
        }
      } else {
        console.log(`No event found by slug: ${eventIdentifier}`);
      }
    }

    // Fallback: If event not found by ID/slug, try to find it by user email
    if (!event || !eventParticipant) {
      console.log(`Fallback: Looking for event by user email: ${email}`);
      const participantWithEvent = await EventParticipantRepository.findOne({
        where: { email: email },
        relations: ["event"],
      });

      if (participantWithEvent && participantWithEvent.event) {
        console.log(
          `Fallback: Found event by user email: ${participantWithEvent.event.name} (${participantWithEvent.event.id})`
        );
        event = participantWithEvent.event;
        eventParticipant = participantWithEvent;
      }
    }

    if (event) {
      if (eventParticipant) {
        console.log(
          `Processing payment for participant: ${eventParticipant.email} in event: ${event.name}`
        );
        console.log(
          `Before payment - Participant deposited: $${eventParticipant.depositedAmount}, Event deposit: $${event.depositAmount}, Event pending: $${event.pendingAmount}`
        );

        eventParticipant.depositedAmount =
          eventParticipant.depositedAmount + amount;

        if (eventParticipant.depositedAmount >= eventParticipant.equityAmount) {
          eventParticipant.paymentStatus = PaymentStatus.PAID;
        }

        await EventParticipantRepository.save(eventParticipant);

        event.depositAmount = event.depositAmount + amount;
        event.pendingAmount = event.pendingAmount - amount;

        if (event.pendingAmount <= 0) {
          event.paymentStatus = PaymentStatus.PAID;
        }

        await EventRepository.save(event);

        console.log(
          `After payment - Participant deposited: $${eventParticipant.depositedAmount}, Event deposit: $${event.depositAmount}, Event pending: $${event.pendingAmount}`
        );
      } else {
        // Let's also check what participants exist for this event
        const allParticipants = await EventParticipantRepository.find({
          where: { event: { id: event.id } },
          relations: ["user"],
        });
        console.log(
          `All participants for event ${event.name}:`,
          allParticipants.map((p) => ({ email: p.email, role: p.role }))
        );

        throw new Error(
          `Participant not Found! Email: ${email}, Event: ${eventIdentifier}`
        );
      }
    } else {
      throw new Error(`Event not Found! Identifier: ${eventIdentifier}`);
    }
  },
};

export default paymentService;
