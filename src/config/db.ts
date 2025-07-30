import { DataSource } from "typeorm";
import { User } from "../entities/user";
import { Event } from "../entities/event";
import { EventParticipant } from "../entities/eventParticipant";
import { InviteToken } from "../entities/inviteToken";
import { OTP } from "../entities/otp";
import { EventRequest } from "../entities/eventRequest";
import { UserMedia } from "../entities/userMedia";
import { EventFeedback } from "../entities/eventFeedback";
import { Notification } from "../entities/notifications";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [
    User,
    Event,
    EventParticipant,
    InviteToken,
    OTP,
    EventRequest,
    UserMedia,
    EventFeedback,
    Notification,
  ],
  migrations: [],
  subscribers: [],
});
