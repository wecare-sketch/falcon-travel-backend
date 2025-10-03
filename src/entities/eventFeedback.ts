import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";
import { Event } from "./event";

@Entity("event_feedback")
export class EventFeedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Event, (event) => event.feedbacks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @Column({ type: "int", default: 0, nullable: true })
  Q1!: number;

  @Column({ type: "int", default: 0, nullable: true })
  Q2!: number;

  @Column({ type: "int", default: 0, nullable: true })
  Q3!: number;

  @Column({ type: "int", default: 0, nullable: true })
  Q4!: number;

  @Column({ type: "int", default: 0, nullable: true })
  Q5!: number;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column({ type: "float" })
  averageRating!: number;

  @OneToOne(() => User, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
