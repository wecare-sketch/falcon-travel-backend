import dotenv from "dotenv";
dotenv.config();

import morgan from "morgan";
import http from "http";
import express, { Request, Response } from "express";
import { createAdminUser } from "./scripts/createAdmin";
import { AppDataSource } from "./config/db";
import userRoutes from "./routes/user";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import otpRoutes from "./routes/otp";
import { globalLimiter, otpLimiter } from "./middlewares/rateLimiter";
import { initiateSocket } from "./config/socket";

const app = express();
const server = http.createServer(app);

initiateSocket(server);

app.use(express.json());
app.use(globalLimiter);
app.use(morgan("dev"));

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connected");

    app.get("/", (req: Request, res: Response) => {
      res.json({ message: "Welcome to your Car Rental Service Web App" });
    });

    await createAdminUser();

    app.use("/api/user", userRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/otp", otpLimiter, otpRoutes);

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Server running on port ${port} [${process.env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize data source:", err);
    process.exit(1);
  });
