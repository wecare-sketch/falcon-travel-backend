import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInitialEquityToEvents1756993495606
  implements MigrationInterface
{
  name = "AddInitialEquityToEvents1756993495606";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD COLUMN IF NOT EXISTS "initialEquity" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events" 
      DROP COLUMN IF EXISTS "initialEquity"
    `);
  }
}
