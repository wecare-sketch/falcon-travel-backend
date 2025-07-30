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
import authRoutes from "./routes/auth";
import otpRoutes from "./routes/otp";

import { globalLimiter, otpLimiter } from "./middlewares/rateLimiter";

// -----------------------------
// Create app (no http.Server here)
// -----------------------------
const app = express();

const isProd =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Trust proxy safely:
// - On Vercel: trust 1 hop
// - Local dev / vercel dev: trust loopback
app.set("trust proxy", isProd ? 1 : "loopback");

// -----------------------------
// CORS
// -----------------------------
/**
 * Allow your deployed frontend to call the API.
 * - Set CLIENT_URL in Vercel (e.g., https://falcon-travel-frontend.vercel.app)
 * - You can also support multiple origins by comma-separating them in CLIENT_URL
 */
const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server or curl
      if (clientUrls.length === 0) return callback(null, true); // if not set, allow all (adjust if you want stricter)
      if (clientUrls.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// -----------------------------
// Global middleware
// -----------------------------
app.use(express.json());
app.use(globalLimiter);
app.use(morgan("dev"));

// -----------------------------
// DataSource initialization (serverless-safe)
// -----------------------------
/**
 * Reuse a single initialization promise per lambda instance to avoid:
 *  - Duplicate initialization attempts
 *  - `CannotConnectAlreadyConnectedError`
 */
let dsInitPromise: Promise<void> | null =
  (globalThis as any).__DS_INIT_PROMISE || null;

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
      // Run idempotent bootstrapping AFTER schema exists
      await createAdminUser();
    })
    .catch((err) => {
      console.error("Failed to initialize data source:", err);
      // allow retry on next request
      setGlobalInitPromise(null);
      throw err;
    });

  setGlobalInitPromise(p);
  return p;
}

// Optionally kick off init on cold start (don't block startup)
ensureDataSource().catch(() => {
  /* handled per-request below */
});

// -----------------------------
// Health route
// -----------------------------
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to your Car Rental Service Web App" });
});

// Ensure DB is ready before real routes
app.use(async (_req, _res, next) => {
  try {
    await ensureDataSource();
    next();
  } catch (e) {
    next(e);
  }
});

// -----------------------------
// Routes
// -----------------------------
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpLimiter, otpRoutes);

// -----------------------------
// Error handler (JSON)
// -----------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // You can customize how much detail to expose in prod
  const status = err.status || 500;
  const message =
    err.message || "Internal Server Error (unexpected serverless error)";
  if (!isProd) {
    console.error(err);
  }
  res.status(status).json({ error: message });
});

export default app;
