import { MigrationInterface, QueryRunner } from "typeorm";

export class EventSchemaChanges1754249345812 implements MigrationInterface {
    name = 'EventSchemaChanges1754249345812'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_tokens" RENAME COLUMN "eventSlug" TO "eventId"`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" DROP COLUMN "eventId"`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" ADD "eventId" uuid`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" ADD CONSTRAINT "UQ_6ab75aa5215272cbb39f35a05af" UNIQUE ("eventId")`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" ADD CONSTRAINT "FK_6ab75aa5215272cbb39f35a05af" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invite_tokens" DROP CONSTRAINT "FK_6ab75aa5215272cbb39f35a05af"`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" DROP CONSTRAINT "UQ_6ab75aa5215272cbb39f35a05af"`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" DROP COLUMN "eventId"`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" ADD "eventId" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "invite_tokens" RENAME COLUMN "eventId" TO "eventSlug"`);
    }

}
