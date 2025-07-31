import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "./event";
import { MemberRole, PaymentStatus } from "../constants/enums";
import { User } from "./user";
import { EventRequest } from "./eventRequest";

@Entity("event_participants")
export class EventParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.participantHistory)
  user?: User;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "int" })
  equityAmount!: number;

  @Column({ type: "int", default: 0 })
  depositedAmount!: number;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: "enum",
    enum: MemberRole,
    default: MemberRole.MEMBER,
  })
  role!: MemberRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Event, (event) => event.participants, {
    onDelete: "CASCADE",
  })
  event?: Event;
}
