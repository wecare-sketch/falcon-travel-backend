import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Event } from "./event";

@Entity("invoices")
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  invoiceNumber!: string;

  @ManyToOne(() => Event, (ev) => ev.transactions, { onDelete: "CASCADE" })
  event!: Event;

  @Column({ type: "int" })
  amount!: number;

  @Column({ type: "int" })
  paid!: number;

  @Column({ type: "int" })
  due!: number;

  @Column({ type: "varchar", nullable: true })
  pdfPath?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
