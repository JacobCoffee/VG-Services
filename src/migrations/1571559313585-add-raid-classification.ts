import { MigrationInterface, QueryRunner, TableColumn} from "typeorm";

export class addRaidClassification1571559313585 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.addColumn('raids', new TableColumn({
      name: 'instances',
      type: 'jsonb'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn('raids', 'instances');
  }
}
