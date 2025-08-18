import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedMigrations1755533123480 implements MigrationInterface {
    name = 'UpdatedMigrations1755533123480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dateOfBirth"`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "location" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "name" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "imageUrl" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "location" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "expiresAt" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "expiresAt" SET DEFAULT (now() + '7 days')`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "location" character varying(500) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "imageUrl" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "name" SET DEFAULT 'Untitled Event'`);
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "location" character varying(500) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD "dateOfBirth" character varying(255)`);
    }

}
