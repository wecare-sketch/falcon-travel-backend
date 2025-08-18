import Stripe from "stripe";
import paymentService from "../services/payment";
import { AuthenticatedRequest } from "../types/request";
import { errorHandler } from "../utils/errorHandler";
import { Response } from "express";
import { stripe } from "../config/stripe";
// import { getIO } from "../config/socket";
import { AppDataSource } from "../config/db";
import notificationService from "../services/notification";
import { NotificationInputDts } from "../types/notification";
import { PaymentStatus } from "../constants/enums";

export const payThruStripe = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { amount } = req.body;

    const user = req.user!;

    const { event } = req.params;

    const result = await paymentService.payThruStripe(
      amount,
      event,
      user.email
    );

    return res.json(result);
  }
);

export const handleWebhook = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (event.type === "payment_intent.succeeded") {
      if (!paymentIntent.amount_received) {
        console.warn(
          "Payment succeeded event received, but no money was received."
        );
        return res.status(400).send("Invalid payment: Zero amount received.");
      }

      const expectedAmount = paymentIntent.amount;
      const receivedAmount = paymentIntent.amount_received;

      if (receivedAmount !== expectedAmount) {
        console.warn(
          `Amount mismatch: Expected ${expectedAmount}, Received ${receivedAmount}`
        );

        await paymentService.updateStatus(
          paymentIntent,
          PaymentStatus.DISCREPANCY
        );

        return res.status(200).send("Amount discrepancy flagged");
      }

      console.log("Payment Success!");
      await paymentService.updateStatus(paymentIntent, PaymentStatus.PAID);
    } else if (event.type === "payment_intent.payment_failed") {
      console.log("Payment Failed");
      await paymentService.updateStatus(paymentIntent, PaymentStatus.FAILED);
    }

    return res.sendStatus(200);
  }
);
