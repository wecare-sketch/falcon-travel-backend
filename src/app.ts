// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import morgan from "morgan";

import { AppDataSource } from "./config/db";
import { createAdminUser } from "./scripts/createAdmin";

import userRoutes from "./routes/user";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import otpRoutes from "./routes/otp";

import { globalLimiter, otpLimiter } from "./middlewares/rateLimiter";

// Build the Express app (do NOT create an http.Server here)
const app = express();
/**
 * Trust proxy safely:
 * - In prod (Vercel), trust the single hop in front of your app.
 * - In local dev (node or `vercel dev`), trust only loopback.
 *
 * DO NOT use `true` (trust all).
 */
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

app.set('trust proxy', isProd ? 1 : 'loopback');

app.use(express.json());
app.use(globalLimiter);
app.use(morgan("dev"));

// ---- Data Source initialization (serverless-safe) ----
// Ensure we initialize once per execution environment and reuse on subsequent invocations.
let dsInitPromise: Promise<void> | null = null;

function ensureDataSource() {
  if (!dsInitPromise) {
    dsInitPromise = AppDataSource.initialize()
      .then(async () => {
        console.log("Database connected");
        // Run idempotent bootstrapping (e.g., ensure admin user)
        await createAdminUser();
      })
      .catch((err) => {
        console.error("Failed to initialize data source:", err);
        // Allow re-attempt on next request if initialization failed
        dsInitPromise = null;
        throw err;
      });
  }
  return dsInitPromise;
}

// Optionally kick off init on cold start (don’t block startup)
ensureDataSource().catch(() => { /* handled per-request below */ });

// Health route
app.get("/", (_req, res) => {
  res.json({ message: "Welcome to your Car Rental Service Web App" });
});

// Make sure DB is ready before hitting real routes
app.use(async (_req, _res, next) => {
  try {
    await ensureDataSource();
    next();
  } catch (e) {
    next(e);
  }
});

// Your routes (keep existing prefixes)
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpLimiter, otpRoutes);

export default app;
