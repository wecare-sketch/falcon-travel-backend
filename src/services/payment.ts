import Stripe from "stripe";
import { AppDataSource } from "../config/db";
import { stripe } from "../config/stripe";
import { Transaction } from "../entities/transactions";
import eventService from "./event";
import userService from "./user";
import { NotificationInputDts } from "../types/notification";
import notificationService from "./notification";
import { stat } from "fs";
import { notificationType, PaymentStatus } from "../constants/enums";
import { getIO } from "../config/socket";
import { User } from "../entities/user";

const TransactionRepository = AppDataSource.getRepository(Transaction);

const paymentService = {
  payThruStripe: async (amount: number, slug: string, email: string) => {
    const user = await userService.findUserWithEmail(email);
    const event = await eventService.getEventBySlug(slug);

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
          eventType: transaction.event?.eventType,
          event: transaction.event,
          user: admin,
          metadata: { user: transaction.user },
        } as NotificationInputDts;

        await notificationService.send(notification, [admin]);
      } else if (status === PaymentStatus.PAID) {
        const message = `${transaction.user} has paid ${transaction.amountReceived} to the event (${transaction.event?.slug})`;

        const notification = {
          message: message,
          emit_event: notificationType.PAYMENT,
          title: "Incoming Payment",
          eventType: transaction.event?.eventType,
          event: transaction.event,

          metadata: {
            slug: transaction.event?.slug,
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
};

export default paymentService;
