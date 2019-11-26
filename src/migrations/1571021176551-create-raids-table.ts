import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class createRaidsTable1571021176551 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(new Table({
      name: 'raids',
      columns: [{
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment'
      },{
        name: 'raid_id',
        type: 'varchar(64)'
      },{
        name: 'parsed',
        type: 'jsonb'
      }]
    }), true);

    await queryRunner.createIndex("raids", new TableIndex({
      name: "IDX_RAID_ID",
      isUnique: true,
      columnNames: ["raid_id"]
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable('raids');
  }
}
