import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("invite_tokens")
export class InviteToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  inviteToken!: string;

  @Column({ type: "varchar", length: 255 })
  hostEmail!: string;

  @Column({ type: "varchar", length: 255 })
  eventSlug!: string;

  @Column({ type: "int", default: 0 })
  registered!: number;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
