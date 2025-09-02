import Stripe from "stripe";
import paymentService from "../services/payment";
import { AuthenticatedRequest } from "../types/request";
import { errorHandler } from "../utils/errorHandler";
import { Response, Request } from "express";
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
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return res.status(500).send("Webhook secret not configured");
    }

    if (!sig) {
      console.error("Missing stripe-signature header");
      return res.status(400).send("Missing stripe-signature header");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );
      
      // Type guard to ensure we have a PaymentIntent
      if (event.data.object && 'id' in event.data.object) {
        console.log(`Webhook received: ${event.type} for payment: ${event.data.object.id}`);
      } else {
        console.log(`Webhook received: ${event.type}`);
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (event.type === "payment_intent.succeeded") {
      console.log(`Processing successful payment: ${paymentIntent.id}`);
      
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

      console.log("Payment Success! Updating status...");
      await paymentService.updateStatus(paymentIntent, PaymentStatus.PAID);
      console.log("Payment status updated successfully");
    } else if (event.type === "payment_intent.payment_failed") {
      console.log("Payment Failed");
      await paymentService.updateStatus(paymentIntent, PaymentStatus.FAILED);
    }

    return res.sendStatus(200);
  }
);
