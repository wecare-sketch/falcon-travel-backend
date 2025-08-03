import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedEvents1754165072630 implements MigrationInterface {
    name = 'UpdatedEvents1754165072630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "totalAmount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "pendingAmount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "depositAmount" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "equityDivision" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "cohosts"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "cohosts" jsonb`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "participants"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "participants" jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."events_eventstatus_enum" RENAME TO "events_eventstatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."events_eventstatus_enum" AS ENUM('pending', 'finished', 'expired', 'created', 'started', 'discrepancy')`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" TYPE "public"."events_eventstatus_enum" USING "eventStatus"::"text"::"public"."events_eventstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."events_eventstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "cohosts"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "cohosts" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "cohosts"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "cohosts" character varying(255)`);
        await queryRunner.query(`CREATE TYPE "public"."events_eventstatus_enum_old" AS ENUM('pending', 'finished', 'expired', 'started', 'discrepancy')`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" TYPE "public"."events_eventstatus_enum_old" USING "eventStatus"::"text"::"public"."events_eventstatus_enum_old"`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "eventStatus" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."events_eventstatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."events_eventstatus_enum_old" RENAME TO "events_eventstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "participants"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "participants" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "cohosts"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "cohosts" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "equityDivision" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "depositAmount" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "pendingAmount" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event_requests" ALTER COLUMN "totalAmount" SET NOT NULL`);
    }

}
