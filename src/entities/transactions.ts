import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "./event";
import { User } from "./user";

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  paymentID!: string;

  @Column({ type: "varchar", length: 255 })
  currency!: string;

  @Column({ type: "varchar", length: 255 })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  paymentMethod?: string;

  @Column({ type: "integer", default: 0 })
  amountIntended?: number;

  @Column({ type: "integer", default: 0 })
  amountReceived?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  paidAt!: Date;

  @ManyToOne(() => Event, (event) => event.transactions)
  event!: Event;

  @ManyToOne(() => User, (user) => user.transactions)
  user?: User;
}
