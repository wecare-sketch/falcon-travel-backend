// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import { AppDataSource } from "./config/db";
import { createAdminUser } from "./scripts/createAdmin";

import userRoutes from "./routes/user";
import adminRoutes from "./routes/admin";
import sharedRoutes from "./routes/shared";
import authRoutes from "./routes/auth";
import otpRoutes from "./routes/otp";
import webhookHandler from "./routes/webhook";
import paymentRoutes from "./routes/payment";

import { globalLimiter, otpLimiter } from "./middlewares/rateLimiter";

// -----------------------------
const app = express();
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
app.set("trust proxy", isProd ? 1 : "loopback");

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH" ,"PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, // must be false when using "*"
    optionsSuccessStatus: 200,
  })
);

// ⛔️ Special raw body for Stripe webhook (must come before express.json)
app.use("/api/webhook", express.raw({ type: "application/json" }), webhookHandler);

// Global middleware
app.use(express.json());
app.use(morgan("dev"));

// DataSource init
let dsInitPromise: Promise<void> | null = (globalThis as any).__DS_INIT_PROMISE || null;
function setGlobalInitPromise(p: Promise<void> | null) {
  (globalThis as any).__DS_INIT_PROMISE = p ?? null;
  dsInitPromise = p ?? null;
}
export function ensureDataSource(): Promise<void> {
  if (AppDataSource.isInitialized) return Promise.resolve();
  if (dsInitPromise) return dsInitPromise;

  const p = AppDataSource.initialize()
    .then(async () => {
      console.log("Database connected");
      await AppDataSource.runMigrations(); // 👈 This runs pending migrations
      await createAdminUser();
    })
    .catch((err) => {
      console.error("Failed to initialize data source:", err);
      setGlobalInitPromise(null);
      throw err;
    });

  setGlobalInitPromise(p);
  return p;
}
ensureDataSource().catch(() => {});

// Health
app.get("/", (_req, res) => {
  res.json({ message: "Welcome to your Car Rental Service Web App" });
});

// Ensure DB ready
app.use(async (_req, _res, next) => {
  try {
    await ensureDataSource();
    next();
  } catch (e) {
    next(e);
  }
});

app.use("/api", sharedRoutes);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpLimiter, otpRoutes);
// app.use("/api/billing", paymentRoutes);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  if (!isProd) console.error(err);
  res.status(status).json({ error: message });
});

export default app;
