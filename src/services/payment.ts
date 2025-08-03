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

    if (event.eventStatus !== EventStatus.STARTED) {
      throw new Error(`This Event is currently ${event.eventStatus}`);
    }

    const now = new Date(Date.now());
    const expiryDate = new Date(
      new Date(event.updatedAt).getTime() + event.hoursReserved * 60 * 60 * 1000
    );
    const hasExpired = now >= expiryDate;

    if (hasExpired) {
      event.eventStatus = EventStatus.EXPIRED;
      await EventRepository.save(event);
      throw new Error(`This Event has already expired!`);
    }

    if (event.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Event Already Paid For!");
    }

    if (eventParticipant.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Unable to process this payment");
    }

    amount = amount * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

    const newTransaction = TransactionRepository.create({
      paymentID: paymentIntent.id as string,
      amountIntended: paymentIntent.amount as number,
      currency: paymentIntent.currency as string,
      status: PaymentStatus.PENDING,
      user: user,
      event: event,
    });

    await TransactionRepository.save(newTransaction);

    return {
      message: "success",
      data: { payment_Hash: paymentIntent.client_secret },
    };
  },

  updateStatus: async (
    payment: Stripe.PaymentIntent,
    status: PaymentStatus
  ) => {
    const transaction = await TransactionRepository.findOne({
      where: { paymentID: payment.id },
    });

    if (!transaction) {
      console.warn(`Transaction Entry not found for paymentID: ${payment}`);
      return;
    }

    if (transaction.status === status) {
      console.log(
        `Status for ${payment} already '${status}', skipping update.`
      );
      return;
    }

    const payment_method = await stripe.paymentMethods.retrieve(
      payment.payment_method as string
    );

    transaction.status = payment.status;
    transaction.amountReceived = payment.amount_received;
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
        await paymentService.processPayment(
          transaction.user!.email,
          transaction.amountReceived,
          transaction.event.slug
        );

        const message = `${transaction.user} has paid ${transaction.amountReceived} to the event (${transaction.event.slug})`;

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

  processPayment: async (email: string, amount: number, eventSlug: string) => {
    const event = await EventRepository.findOne({ where: { slug: eventSlug } });
    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email: email, event: { slug: eventSlug } },
    });
    if (event) {
      if (eventParticipant) {
        eventParticipant.depositedAmount =
          eventParticipant.depositedAmount + amount;

        if (eventParticipant.depositedAmount >= eventParticipant.equityAmount) {
          eventParticipant.paymentStatus = PaymentStatus.PAID;
        }

        await EventParticipantRepository.save(eventParticipant);
      } else {
        throw new Error("Participant not Found!");
      }

      event.depositAmount = event.depositAmount + amount;
      event.pendingAmount = event.pendingAmount - amount;

      if (event.pendingAmount <= 0) {
        event.paymentStatus = PaymentStatus.PAID;
      }

      await EventRepository.save(event);
    } else {
      throw new Error("Event not Found!");
    }
  },
};

export default paymentService;
