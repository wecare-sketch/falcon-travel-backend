import Stripe from "stripe";
import paymentService from "../services/payment";
import { AuthenticatedRequest } from "../types/request";
import { errorHandler } from "../utils/errorHandler";
import { Response } from "express";
import { stripe } from "../config/stripe";
import { getIO } from "../config/socket";
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

// Webhook Hit:  {
//   id: 'evt_3RoQIfP5Rj0r2Xfo1LuS9qP0',
//   object: 'event',
//   api_version: '2025-06-30.basil',
//   created: 1753367971,
//   data: {
//     object: {
//       id: 'pi_3RoQIfP5Rj0r2Xfo1DkDjscu',
//       object: 'payment_intent',
//       amount: 4000,
//       amount_capturable: 0,
//       amount_details: [Object],
//       amount_received: 4000,
//       application: null,
//       application_fee_amount: null,
//       automatic_payment_methods: [Object],
//       canceled_at: null,
//       cancellation_reason: null,
//       capture_method: 'automatic_async',
//       client_secret: 'pi_3RoQIfP5Rj0r2Xfo1DkDjscu_secret_0VnTkJXbYtr7igfwH1WM9IMsK',
//       confirmation_method: 'automatic',
//       created: 1753367953,
//       currency: 'usd',
//       customer: null,
//       description: null,
//       last_payment_error: null,
//       latest_charge: 'ch_3RoQIfP5Rj0r2Xfo1jvlLs45',
//       livemode: false,
//       metadata: {},
//       next_action: null,
//       on_behalf_of: null,
//       payment_method: 'pm_1RoQIwP5Rj0r2XfoPd8VQtmm',
//       payment_method_configuration_details: [Object],
//       payment_method_options: [Object],
//       payment_method_types: [Array],
//       processing: null,
//       receipt_email: null,
//       review: null,
//       setup_future_usage: null,
//       shipping: null,
//       source: null,
//       statement_descriptor: null,
//       statement_descriptor_suffix: null,
//       status: 'succeeded',
//       transfer_data: null,
//       transfer_group: null
//     }
//   },
//   livemode: false,
//   pending_webhooks: 1,
//   request: {
//     id: 'req_iPKyvnpKW9pJan',
//     idempotency_key: 'a4cc5aea-77d8-4021-86fa-919dd9f1883a'
//   },
//   type: 'payment_intent.succeeded'
// }
