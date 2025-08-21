import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedMigrations1755533123480 implements MigrationInterface {
    name = 'UpdatedMigrations1755533123480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the dateOfBirth column from the users table
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dateOfBirth"`);

        // Drop the existing "location" column from event_requests table
        await queryRunner.query(`ALTER TABLE "event_requests" DROP COLUMN "location"`);

        // Add the "location" column as jsonb NOT NULL with a default value of an empty object
        await queryRunner.query(`ALTER TABLE "event_requests" ADD "location" jsonb NOT NULL DEFAULT '{}'`);

        // Update all NULL values in the "location" column with a default JSON object before altering the column
        await queryRunner.query(`
            UPDATE "event_requests"
            SET "location" = '{}' 
            WHERE "location" IS NULL
        `);

        // Remove the default values from the "events" table columns
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "name" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "imageUrl" DROP DEFAULT`);

        // Drop the old "location" column from events table if it exists and add it as jsonb NOT NULL
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "location" jsonb NOT NULL DEFAULT '{}'`);

        // Update all NULL values in the "location" column in events table with a default value
        await queryRunner.query(`
            UPDATE "events"
            SET "location" = '{}' 
            WHERE "location" IS NULL
        `);

        // Remove the default expiration time from the "events" table
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "expiresAt" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore the default values for columns if rolling back
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
