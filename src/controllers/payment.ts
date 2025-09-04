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

export const payRemainingThruStripe = errorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    const { event } = req.params;

    const result = await paymentService.payRemainingThruStripe(
      event,
      user.email
    );

    return res.json(result);
  }
);

// export const handleWebhook = errorHandler(
//   async (req: AuthenticatedRequest, res: Response) => {
//     const sig = req.headers["stripe-signature"] as string | undefined;
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
//     if (!sig) {
//       return res.status(400).send("Missing stripe-signature header");
//     }

//     let event: Stripe.Event;
//     try {
//       // IMPORTANT: req.body is a Buffer because of express.raw in app.ts
//       event = stripe.webhooks.constructEvent(
//         req.body as Buffer,
//         sig,
//         webhookSecret
//       );
//     } catch (err: any) {
//       console.error("Webhook signature verification failed.", err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     console.log("Event Received Webhook:", event);

//     if (event.type === "payment_intent.succeeded") {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;
//       if (!paymentIntent.amount_received) {
//         console.warn("Succeeded event without amount_received");
//         return res.status(400).send("Invalid payment");
//       }

//       if (paymentIntent.amount_received !== paymentIntent.amount) {
//         await paymentService.updateStatus(
//           paymentIntent,
//           PaymentStatus.DISCREPANCY
//         );
//         return res.status(200).send("Amount discrepancy flagged");
//       }

//       await paymentService.updateStatus(paymentIntent, PaymentStatus.PAID);
//     } else if (event.type === "payment_intent.payment_failed") {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;
//       await paymentService.updateStatus(paymentIntent, PaymentStatus.FAILED);
//     }

//     return res.sendStatus(200);
//   }
// );

export const handleWebhook = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!sig) return res.status(400).send("Missing stripe-signature header");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    // ✅ CHECKOUT (your current flow)
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // For card payments, session.payment_status === 'paid' means money captured
      if (session.payment_status === "paid") {
        await paymentService.updateStatusFromCheckoutSession(
          session,
          PaymentStatus.PAID
        );
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentService.updateStatusFromCheckoutSession(
        session,
        PaymentStatus.PAID
      );
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentService.updateStatusFromCheckoutSession(
        session,
        PaymentStatus.FAILED
      );
      break;
    }

    // // ✅ Keep these for any non-Checkout (Payment Element or CLI) flows you run
    // case "payment_intent.succeeded": {
    //   const pi = event.data.object as Stripe.PaymentIntent;
    //   await paymentService.updateStatus(pi, PaymentStatus.PAID);
    //   break;
    // }
    // case "payment_intent.payment_failed": {
    //   const pi = event.data.object as Stripe.PaymentIntent;
    //   await paymentService.updateStatus(pi, PaymentStatus.FAILED);
    //   break;
    // }

    default:
      // ignore others
      break;
  }

  return res.sendStatus(200);
};
