// import {
//   Entity,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   PrimaryGeneratedColumn,
//   OneToOne,
//   JoinColumn,
//   ManyToOne,
// } from "typeorm";
// import { Event } from "./event";
// import { User } from "./user";

// @Entity("verification_tokens")
// export class VerificationToken {
//   @PrimaryGeneratedColumn("uuid")
//   id!: string;

//   @Column({ type: "varchar", length: 255, unique: true })
//   token!: string;

//   @Column({ type: "varchar", length: 255 })
//   email!: string;

//   @Column({ type: "bool", default: false })
//   verified!: Boolean;

//   @CreateDateColumn()
//   createdAt!: Date;

//   @UpdateDateColumn()
//   updatedAt!: Date;
// }
