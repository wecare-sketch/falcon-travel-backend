import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeExpiresAtNullable1754137021126 implements MigrationInterface {
    name = 'MakeExpiresAtNullable1754137021126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "expiresAt" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "expiresAt" SET NOT NULL`);
    }

}
