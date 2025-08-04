import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationSchemaChanges1754322426135 implements MigrationInterface {
    name = 'NotificationSchemaChanges1754322426135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_7f30bf6237f6d8c74823f183960"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_7f30bf6237f6d8c74823f183960" FOREIGN KEY ("requestId") REFERENCES "event_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_7f30bf6237f6d8c74823f183960"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_7f30bf6237f6d8c74823f183960" FOREIGN KEY ("requestId") REFERENCES "event_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
