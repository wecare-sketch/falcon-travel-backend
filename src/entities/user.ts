import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from "typeorm";
import { Event } from "./event";
import { UserRole } from "../constants/enums";
import { Notification } from "./notifications";
import { Transaction } from "./transactions";
import { EventParticipant } from "./eventParticipant";
import { EventMedia } from "./eventMedia";
import { EventRequest } from "./eventRequest";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  fullName?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  phoneNumber?: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => Event, (event) => event.cohosts)
  cohostedEvents!: Event[];

  @OneToMany(() => Notification, (notif) => notif.user)
  notifications!: Notification[];

  @OneToMany(() => Transaction, (trans) => trans.user)
  transactions!: Transaction[];

  @OneToMany(() => EventParticipant, (participant) => participant.user)
  participantHistory?: EventParticipant[];

  @OneToMany(() => EventRequest, (request) => request.user)
  eventRequests?: EventRequest[];

  @OneToMany(() => EventMedia, (media) => media.event)
  media?: EventMedia[];

  @Column({ type: "varchar", nullable: true, unique: true })
  appleSubId?: string;
}
