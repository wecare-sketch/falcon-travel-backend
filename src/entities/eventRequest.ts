import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentStatus } from "../constants/enums";
import { User } from "./user";

@Entity("event_requests")
export class EventRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 255 })
  imageUrl!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

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

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  pickupLocation?: string;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  dropOffLocation?: string;

  @Column({ type: "jsonb" })
  stops!: string[];

  @Column({ type: "varchar", length: 255 })
  vehicle!: string;

  @Column({ type: "int" })
  hoursReserved!: number;

  @Column({ type: "int" })
  passengerCount!: number;

  @Column({ type: "int", nullable: true })
  totalAmount?: number;

  @Column({ type: "int", nullable: true })
  pendingAmount?: number;

  @Column({ type: "int", nullable: true })
  depositAmount?: number;

  @Column({ type: "int", nullable: true })
  equityDivision?: number;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ManyToOne(() => User, (user) => user.eventRequests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  host?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  tripNotes?: string;

  @Column({ type: "jsonb", nullable: true })
  cohosts?: string[];

  @Column({ type: "jsonb", nullable: true })
  participants?: string[];
}
