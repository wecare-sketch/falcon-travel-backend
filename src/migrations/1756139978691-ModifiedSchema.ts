import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifiedSchema1756139978691 implements MigrationInterface {
  name = "ModifiedSchema1756139978691";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- event_requests ----------
    // 1) Add stops with a default so existing rows are valid, then enforce NOT NULL and remove the default
    await queryRunner.query(
      `ALTER TABLE "event_requests" ADD COLUMN "stops" jsonb DEFAULT '[]'::jsonb`
    );
    await queryRunner.query(
      `UPDATE "event_requests" SET "stops" = '[]'::jsonb WHERE "stops" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "stops" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "stops" DROP DEFAULT`
    );

    // 2) tripNotes is nullable; just add it
    await queryRunner.query(
      `ALTER TABLE "event_requests" ADD COLUMN "tripNotes" character varying(255)`
    );

    // 3) Convert location jsonb -> varchar(255) in place
    //    - drop any default first (e.g., '{}'::jsonb)
    //    - cast to text, strip surrounding quotes if the json was a string, clamp to 255
    //    - fill NULLs with empty string, then enforce NOT NULL
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" TYPE character varying(255)
       USING LEFT(TRIM(BOTH '"' FROM ("location")::text), 255)`
    );
    await queryRunner.query(
      `UPDATE "event_requests" SET "location" = '' WHERE "location" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" SET NOT NULL`
    );

    // ---------- events ----------
    // 1) Add stops with a default so existing rows are valid, then enforce NOT NULL and remove the default
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN "stops" jsonb DEFAULT '[]'::jsonb`
    );
    await queryRunner.query(
      `UPDATE "events" SET "stops" = '[]'::jsonb WHERE "stops" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "stops" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "stops" DROP DEFAULT`
    );

    // 2) tripNotes is nullable; just add it
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN "tripNotes" character varying(255)`
    );

    // 3) Convert location jsonb -> varchar(255) in place (same approach as above)
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" TYPE character varying(255)
       USING LEFT(TRIM(BOTH '"' FROM ("location")::text), 255)`
    );
    await queryRunner.query(
      `UPDATE "events" SET "location" = '' WHERE "location" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" SET NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse location back to jsonb with NOT NULL and a '{}' default.
    // Use to_jsonb(text) so ANY varchar value becomes valid JSON (a JSON string).
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" TYPE jsonb USING COALESCE(to_jsonb("location"), '{}'::jsonb)`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "location" SET DEFAULT '{}'::jsonb`
    );

    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" TYPE jsonb USING COALESCE(to_jsonb("location"), '{}'::jsonb)`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" ALTER COLUMN "location" SET DEFAULT '{}'::jsonb`
    );

    // Drop newly added columns
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN "tripNotes"`
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN "stops"`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" DROP COLUMN "tripNotes"`
    );
    await queryRunner.query(
      `ALTER TABLE "event_requests" DROP COLUMN "stops"`
    );
  }
}
