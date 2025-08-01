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

@Entity("event_media")
export class EventMedia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  url!: string;

  @ManyToOne(() => Event, (event) => event.media, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @ManyToOne(() => User, (user) => user.media, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
