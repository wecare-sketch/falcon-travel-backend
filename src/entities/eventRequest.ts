import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import { EventParticipant } from "./eventParticipant";
import { PaymentStatus } from "../constants/enums";

@Entity("eventrequests")
export class EventRequest {
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
  hoursReserved!: number;

  @Column({ type: "int" })
  passengerCount!: number;

  @Column({ type: "int" })
  totalAmount?: number;

  @Column({ type: "int" })
  pendingAmount?: number;

  @Column({ type: "int" })
  depositAmount?: number;

  @Column({ type: "int" })
  equityDivision?: number;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: "varchar", length: 255 })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  host?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  cohosts?: string[];

  @Column({ type: "varchar", length: 255, nullable: true })
  participants?: string[];
}
