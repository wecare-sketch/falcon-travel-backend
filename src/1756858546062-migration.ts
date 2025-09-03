import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756858546062 implements MigrationInterface {
    name = 'Migration1756858546062'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNumber" character varying NOT NULL, "amount" integer NOT NULL, "paid" integer NOT NULL, "due" integer NOT NULL, "pdfPath" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "eventId" uuid, CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_04aff14c570d89adee993530aa2" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_04aff14c570d89adee993530aa2"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
    }

}
