import Stripe from "stripe";
import { AppDataSource } from "../config/db";
import { stripe } from "../config/stripe";
import { Transaction } from "../entities/transactions";
import eventService from "./event";
import userService from "./user";
import { NotificationInputDts } from "../types/notification";
import notificationService from "./notification";
import { EventType, notificationType, PaymentStatus } from "../constants/enums";
import { Event } from "../entities/event";
import { EventParticipant } from "../entities/eventParticipant";
import { ParticipantInvoice } from "../types/payment";

const TransactionRepository = AppDataSource.getRepository(Transaction);
const EventRepository = AppDataSource.getRepository(Event);
const EventParticipantRepository =
  AppDataSource.getRepository(EventParticipant);

const paymentService = {
  // Accepts amount in DOLLARS
  payThruStripe: async (amount: number, slug: string, email: string) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid Amount!");
    }

    const user = await userService.findUserWithEmail(email);
    const event = await eventService.getEventBySlug(slug);

    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email: user.email, event: { slug } },
    });
    if (!eventParticipant) throw new Error("Participant does not exist!");

    if (event.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Event Already Paid For!");
    }
    if (eventParticipant.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Unable to process this payment");
    }

    // Stripe needs cents
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
      metadata: {
        eventSlug: slug,
        eventName: event.name,
        userEmail: email,
        userId: user.id,
        eventId: event.id,
      },
    });

    // Store dollars in our DB for consistency
    const newTransaction = TransactionRepository.create({
      paymentID: session.id,
      amountIntended: Math.trunc(amount),
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
      relations: ["event", "user"],
    });

    if (!transaction) {
      console.warn(`Transaction not found for paymentID: ${payment.id}`);
      return;
    }

    if (transaction.status === status) {
      console.log(
        `Status for ${payment.id} already '${status}', skipping update.`
      );
      return;
    }

    let brand: string | undefined;
    if (payment.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(
          payment.payment_method as string
        );
        brand = pm.card?.brand;
      } catch {}
    }

    // Convert Stripe cents -> dollars before saving to our DB
    const amountReceivedDollars = Math.trunc(
      (payment.amount_received ?? 0) / 100
    );

    transaction.status = status;
    transaction.amountReceived = amountReceivedDollars;
    transaction.paymentMethod = brand;

    await TransactionRepository.save(transaction);

    if (status === PaymentStatus.DISCREPANCY) {
      const admin = await userService.getAdmin();

      const notification: NotificationInputDts = {
        emit_event: notificationType.PAYMENT,
        title: "Payment Flagged",
        message: `A payment was flagged for unusual behavior: ${payment.id}`,
        eventType: EventType.PAYMENT,
        event: transaction.event,
        user: admin,
        metadata: { user: transaction.user },
      };

      await notificationService.send(notification, []);
      return;
    }

    if (status === PaymentStatus.PAID) {
      await paymentService.processPayment(
        transaction.user!.email,
        amountReceivedDollars,
        transaction.event.slug
      );

      const message = `${
        transaction.user?.email ?? "A user"
      } has paid $${amountReceivedDollars} to the event (${
        transaction.event.name
      })`;

      const notification: NotificationInputDts = {
        message,
        emit_event: notificationType.PAYMENT,
        title: "Incoming Payment",
        eventType: EventType.PAYMENT,
        event: transaction.event,
        metadata: {
          slug: transaction.event.slug,
          paidAt: transaction.paidAt,
          paymentID: transaction.paymentID,
        },
      };

      const users = await eventService.getParticipantsAsUsers(
        transaction.event.slug
      );
      await notificationService.send(notification, users);

      // console.log(`Status updated to '${status}' for paymentID: ${payment.id}`);
      return;
    }
  },

  processPayment: async (email: string, amount: number, eventSlug: string) => {
    const event = await EventRepository.findOne({ where: { slug: eventSlug } });
    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email, event: { slug: eventSlug } },
    });

    if (!event) throw new Error("Event not Found!");
    if (!eventParticipant) throw new Error("Participant not Found!");

    eventParticipant.depositedAmount += amount;
    if (eventParticipant.depositedAmount >= eventParticipant.equityAmount) {
      eventParticipant.paymentStatus = PaymentStatus.PAID;
    }
    await EventParticipantRepository.save(eventParticipant);

    event.depositAmount += amount;
    event.pendingAmount = Math.max(0, event.pendingAmount - amount);
    if (event.pendingAmount === 0) {
      event.paymentStatus = PaymentStatus.PAID;
    }
    await EventRepository.save(event);
  },

  getPaymentsByEmailForEvent: async (eventId: string) => {
    const transactions = await TransactionRepository.createQueryBuilder("t")
      .leftJoinAndSelect("t.user", "user")
      .leftJoin("t.event", "event")
      .where("event.id = :eventId", { eventId })
      .orderBy("t.paidAt", "DESC")
      .getMany();

    const grouped = new Map<string, ParticipantInvoice["payments"]>();

    for (const tx of transactions) {
      const email = tx.user?.email;
      if (!email) continue;

      const existing = grouped.get(email) || [];
      existing.push({
        id: tx.paymentID,
        amount: tx.amountReceived ?? 0,
        method: tx.paymentMethod ?? undefined,
        paidAt: tx.paidAt,
        status: tx.status,
      });
      grouped.set(email, existing);
    }

    return grouped;
  },
};

export default paymentService;
