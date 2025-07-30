import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { EventParticipant } from "./eventParticipant";
import { PaymentStatus } from "../constants/enums";
import { EventFeedback } from "./eventFeedback";
import { Notification } from "./notifications";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 255 })
  eventType!: string;

  @Column({ type: "varchar", length: 255 })
  clientName!: string;

  @Column({ type: "varchar", length: 20 })
  phoneNumber!: string;

  @Column({ type: "date" })
  pickupDate!: string;

  @Column({ type: "varchar", length: 500 })
  location!: string;

  @Column({ type: "varchar", length: 255 })
  vehicle!: string;

  @Column({ type: "int" })
  totalAmount!: number;

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

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  host?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  cohosts?: string[];

  @OneToMany(() => EventParticipant, (ep) => ep.event, { cascade: true })
  participants!: EventParticipant[];

  @OneToMany(() => EventFeedback, (feedback) => feedback.event)
  feedbacks!: EventFeedback[];

  @OneToMany(() => Notification, (notif) => notif.event)
  notifications?: Notification[];
}
