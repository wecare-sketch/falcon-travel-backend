import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { EventParticipant } from "./eventParticipant";
import { EventStatus, PaymentStatus } from "../constants/enums";
import { EventFeedback } from "./eventFeedback";
import { Notification } from "./notifications";
import { Transaction } from "./transactions";
import { EventMessage } from "./eventMessage";
import { EventMedia } from "./eventMedia";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  imageUrl!: string;

  @Column({ type: "varchar", length: 255 })
  eventType!: string;

  @Column({ type: "varchar", length: 255 })
  clientName!: string;

  @Column({ type: "varchar", length: 20 })
  phoneNumber!: string;

  @Column({ type: "date" })
  pickupDate!: string;

  // @Column({ type: "varchar", length: 255 })
  // location!: string;

  @Column({ type: "jsonb" })
  stops!: string[];

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  pickupLocation?: string;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  dropOffLocation?: string;

  @Column({ type: "varchar", length: 255 })
  vehicle!: string;

  @Column({ type: "int" })
  totalAmount!: number;

  @Column({ type: "int", nullable: true })
  initialEquity!: number;

  @Column({ type: "int" })
  passengerCount!: number;

  @Column({ type: "int" })
  pendingAmount!: number;

  @Column({ type: "int" })
  depositAmount!: number;

  @Column({ type: "int" })
  hoursReserved!: number;

  @Column({ type: "int" })
  equityDivision!: number;

  @Column({ type: "enum", enum: EventStatus, default: EventStatus.PENDING })
  eventStatus!: string;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true, default: null })
  expiresAt?: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  host?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  tripNotes?: string;

  @Column({ type: "jsonb", nullable: true })
  cohosts?: string[];

  @OneToMany(() => EventParticipant, (ep) => ep.event, { cascade: true })
  participants?: EventParticipant[];

  @OneToMany(() => EventFeedback, (feedback) => feedback.event, {
    cascade: true,
  })
  feedbacks?: EventFeedback[];

  @OneToMany(() => Notification, (notif) => notif.event, { cascade: true })
  notifications?: Notification[];

  @OneToMany(() => EventMedia, (media) => media.event, { cascade: true })
  media?: EventMedia[];

  @OneToMany(() => EventMessage, (message) => message.event, { cascade: true })
  messages?: EventMessage[];

  @OneToMany(() => Transaction, (trans) => trans.event, { cascade: true })
  transactions?: Transaction[];
}
