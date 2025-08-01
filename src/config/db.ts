
import * as dotenv from "dotenv";
dotenv.config(); // ✅ this must come before using any env variables
import { DataSource } from "typeorm";
import { User } from "../entities/user";
import { Event } from "../entities/event";
import { EventParticipant } from "../entities/eventParticipant";
import { InviteToken } from "../entities/inviteToken";
import { OTP } from "../entities/otp";
import { EventRequest } from "../entities/eventRequest";
import { EventMedia } from "../entities/eventMedia";
import { EventFeedback } from "../entities/eventFeedback";
import { Notification } from "../entities/notifications";
import { Transaction } from "../entities/transactions";
import { EventMessage } from "../entities/eventMessage";

const isUsingUrl = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: "postgres",
  ...(isUsingUrl
    ? {
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  synchronize: false,
  logging: false,
  entities: [
    User,
    Event,
    EventParticipant,
    InviteToken,
    OTP,
    EventRequest,
    EventMedia,
    EventMessage,
    EventFeedback,
    Notification,
    Transaction,
  ],
  migrations: [__dirname + "/../src/migrations/*.ts"],
  subscribers: [],
});
