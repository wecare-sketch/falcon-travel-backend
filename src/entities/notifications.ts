import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user";
import { EventType } from "../constants/enums";
import { Event } from "./event";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 255 })
  description!: string;

  @Column({ type: "enum", enum: EventType, default: EventType.MESSAGE })
  type!: EventType;

  @Column({ type: "boolean", default: false })
  read!: boolean;

  @ManyToOne(() => User, (user) => user.notifications)
  user!: User;

  @ManyToOne(() => Event, (event) => event.notifications, { nullable: true })
  event?: Event;

  @ManyToOne(() => User)
  triggeredBy?: User;

  @CreateDateColumn()
  createdAt!: Date;
}
