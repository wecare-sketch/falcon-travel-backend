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
  payThruStripe: async (
    amount: number,
    slug: string,
    email: string,
    paidFor: number
  ) => {
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

    const perHeadShare = Math.round(eventParticipant.equityAmount ?? 0);
    // if (perHeadShare <= 0) {
    //   throw new Error("Participant share is not configured");
    // }

    if (perHeadShare > 0 && paidFor > 0) {
      const expected = perHeadShare * paidFor;

      // Allow amounts up to expected (for edited/custom amounts)
      if (amount > expected) {
        throw new Error(`Amount cannot exceed $${expected}`);
      }

      if (amount < 0.5) {
        throw new Error("Amount must be at least $0.50");
      }
    }

    const remaining = Math.max(0, Math.round(event.pendingAmount ?? 0));

    if (amount > remaining) {
      throw new Error("Amount exceeds event remaining");
    }

    // Stripe needs cents
    const amountInCents = Math.round(amount * 100);

    const meta = {
      eventSlug: slug,
      eventName: event.name,
      payerEmail: email,
      payerRole: "participant" as const,
      paymentPurpose: "participant_share" as const,
      userId: String(user.id),
      eventId: String(event.id),
      paidFor: String(paidFor),
    };

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
      metadata: meta,
    });

    console.log("session", session);
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

  payRemainingThruStripe: async (slug: string, email: string) => {
    const user = await userService.findUserWithEmail(email);
    const event = await eventService.getEventBySlug(slug);

    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email: user.email, event: { slug } },
    });
    if (!eventParticipant) throw new Error("Participant does not exist!");

    if (event.paymentStatus === PaymentStatus.PAID) {
      throw new Error("Event Already Paid For!");
    }
    if (event.host !== user.email) {
      throw new Error("Unable to process payment");
    }

    // Stripe needs cents

    const remainingAmount = event.pendingAmount;
    const amountInCents = Math.round(remainingAmount * 100);

    const meta = {
      eventSlug: slug,
      eventName: event.name,
      payerEmail: email,
      payerRole: "host" as const,
      paymentPurpose: "final_remaining" as const,
      userId: user.id,
      eventId: event.id,
    };

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
      metadata: meta,
    });

    // console.log("session", session);
    // Store dollars in our DB for consistency
    const newTransaction = TransactionRepository.create({
      paymentID: session.id,
      amountIntended: Math.trunc(remainingAmount),
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

  // updateStatus: async (
  //   payment: Stripe.PaymentIntent,
  //   status: PaymentStatus
  // ) => {
  //   console.log("Payment Webhook:", payment);

  //   const transaction = await TransactionRepository.findOne({
  //     where: { paymentID: payment.id },
  //     relations: ["event", "user"],
  //   });

  //   if (!transaction) {
  //     console.warn(`Transaction not found for paymentID: ${payment.id}`);
  //     return;
  //   }

  //   if (transaction.status === status) {
  //     console.log(
  //       `Status for ${payment.id} already '${status}', skipping update.`
  //     );
  //     return;
  //   }

  //   let brand: string | undefined;
  //   if (payment.payment_method) {
  //     try {
  //       const pm = await stripe.paymentMethods.retrieve(
  //         payment.payment_method as string
  //       );
  //       brand = pm.card?.brand;
  //     } catch {}
  //   }

  //   // Convert Stripe cents -> dollars before saving to our DB
  //   const amountReceivedDollars = Math.trunc(
  //     (payment.amount_received ?? 0) / 100
  //   );

  //   transaction.status = status;
  //   transaction.amountReceived = amountReceivedDollars;
  //   transaction.paymentMethod = brand;

  //   await TransactionRepository.save(transaction);

  //   if (status === PaymentStatus.DISCREPANCY) {
  //     const admin = await userService.getAdmin();

  //     const notification: NotificationInputDts = {
  //       emit_event: notificationType.PAYMENT,
  //       title: "Payment Flagged",
  //       message: `A payment was flagged for unusual behavior: ${payment.id}`,
  //       eventType: EventType.PAYMENT,
  //       event: transaction.event,
  //       user: admin,
  //       metadata: { user: transaction.user },
  //     };

  //     await notificationService.send(notification, []);
  //     return;
  //   }

  //   if (status === PaymentStatus.PAID) {
  //     await paymentService.processPayment(
  //       transaction.user!.email,
  //       amountReceivedDollars,
  //       transaction.event.slug
  //     );

  //     const message = `${
  //       transaction.user?.email ?? "A user"
  //     } has paid $${amountReceivedDollars} to the event (${
  //       transaction.event.name
  //     })`;

  //     const notification: NotificationInputDts = {
  //       message,
  //       emit_event: notificationType.PAYMENT,
  //       title: "Incoming Payment",
  //       eventType: EventType.PAYMENT,
  //       event: transaction.event,
  //       metadata: {
  //         slug: transaction.event.slug,
  //         paidAt: transaction.paidAt,
  //         paymentID: transaction.paymentID,
  //       },
  //     };

  //     const users = await eventService.getParticipantsAsUsers(
  //       transaction.event.slug
  //     );
  //     await notificationService.send(notification, users);

  //     // console.log(`Status updated to '${status}' for paymentID: ${payment.id}`);
  //     return;
  //   }
  // },

  // NEW: update using Checkout Session (maps by session.id)
  updateStatusFromCheckoutSession: async (
    session: Stripe.Checkout.Session,
    status: PaymentStatus
  ) => {
    // Find the transaction you created when you made the Checkout Session
    const transaction = await TransactionRepository.findOne({
      where: { paymentID: session.id }, // you stored session.id here
      relations: ["event", "user"],
    });

    if (!transaction) {
      console.warn(`Transaction not found for session: ${session.id}`);
      return;
    }
    if (transaction.status === status) return;

    let amountReceivedDollars = 0;
    let brand: string | undefined;

    // Prefer reading amounts/brand from the underlying PaymentIntent
    const piId = session.payment_intent as string | null;
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId, {
        expand: ["payment_method"],
      });
      amountReceivedDollars = Math.round((pi.amount_received ?? 0) / 100);

      const pm = pi.payment_method as Stripe.PaymentMethod | null;
      if (pm && pm.type === "card") {
        brand = pm.card?.brand;
      }
    } else if (session.amount_total != null) {
      // Fallback if PI isn’t present (uncommon)
      amountReceivedDollars = Math.round((session.amount_total ?? 0) / 100);
    }

    transaction.status = status;
    transaction.amountReceived = amountReceivedDollars;
    transaction.paymentMethod = brand;

    await TransactionRepository.save(transaction);

    if (status === PaymentStatus.PAID) {
      const meta = session.metadata || {};
      const payerRole = (meta.payerRole as string) || "";
      const purpose = (meta.paymentPurpose as string) || "";
      const paidFor = (meta.paidFor as string) || "1";

      // console.log("metadata payer: ", meta);

      if (payerRole === "host" && purpose === "final_remaining") {
        await paymentService.processFinalHostPayment(
          transaction.user!.email,
          transaction.event.slug,
          amountReceivedDollars
        );
      } else {
        await paymentService.processPayment(
          transaction.user!.email,
          amountReceivedDollars,
          transaction.event.slug,
          paidFor
        );
      }

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
    }

    if (status === PaymentStatus.DISCREPANCY) {
      const admin = await userService.getAdmin();
      const notification: NotificationInputDts = {
        emit_event: notificationType.PAYMENT,
        title: "Payment Flagged",
        message: `A payment was flagged for unusual behavior: ${session.id}`,
        eventType: EventType.PAYMENT,
        event: transaction.event,
        user: admin,
        metadata: { user: transaction.user },
      };
      await notificationService.send(notification, [admin]);
    }
  },

  processPayment: async (
    email: string,
    amount: number,
    eventSlug: string,
    paidFor: string
  ) => {
    const event = await EventRepository.findOne({ where: { slug: eventSlug } });
    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email, event: { slug: eventSlug } },
    });

    if (!event) throw new Error("Event not Found!");
    if (!eventParticipant) throw new Error("Participant not Found!");

    // Track totals
    eventParticipant.depositedAmount =
      (eventParticipant.depositedAmount ?? 0) + Math.round(amount);

    // Your rule: equity represents what they ultimately paid (can be > one share)
    eventParticipant.equityAmount = Math.round(amount);

    // Record how many heads this payment covered
    eventParticipant.paidFor = Math.round(parseInt(paidFor));

    // Mark the participant paid after this payment
    eventParticipant.paymentStatus = PaymentStatus.PAID;

    await EventParticipantRepository.save(eventParticipant);

    // event.depositAmount += amount;
    event.pendingAmount = Math.max(0, event.pendingAmount - amount);
    if (event.pendingAmount === 0) {
      event.paymentStatus = PaymentStatus.PAID;
    }
    await EventRepository.save(event);
  },

  processFinalHostPayment: async (
    email: string,
    eventSlug: string,
    amount: number
  ) => {
    const event = await EventRepository.findOne({ where: { slug: eventSlug } });
    const eventParticipant = await EventParticipantRepository.findOne({
      where: { email, event: { slug: eventSlug } },
    });

    if (!event) throw new Error("Event not Found!");
    if (!eventParticipant) throw new Error("Participant not Found!");

    eventParticipant.depositedAmount += amount;
    eventParticipant.equityAmount += amount;
    eventParticipant.paymentStatus = PaymentStatus.PAID;

    await EventParticipantRepository.save(eventParticipant);

    // event.depositAmount += amount;
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
