import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";

@Entity("user_media")
export class UserMedia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  blob!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
