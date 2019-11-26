import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class auditLogging1571720660931 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(new Table({
      name: 'audit',
      columns: [{
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },{
        name: 'actor',
        type: 'varchar(64)'
      },{
        name: 'audit_event',
        type: 'varchar(32)'
      },{
        name: 'entity_id',
        type: 'int'
      },{
        name: 'entity_type',
        type: 'varchar(64)'
      },{
        name: 'entity_data',
        type: 'jsonb'
      },{
        name: 'timestamp',
        type: 'timestamp',
        default: 'now()'
      }]
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable('audit');
  }
}
