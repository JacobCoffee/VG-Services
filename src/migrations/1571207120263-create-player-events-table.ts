import  {MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class createPlayerEventsTable1571207120263 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(new Table({
      name: 'player_events',
      columns: [{
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },{
        name: 'raid_id',
        type: 'varchar(64)'
      },{
        name: 'player_name',
        type: 'varchar(16)'
      },{
        name: 'gpp',
        type: 'int'
      },{
        name: 'event_type',
        type: 'varchar(32)'
      },{
        name: 'event_data',
        type: 'jsonb'
      }]
    }), true);

    await queryRunner.createIndex('player_events', new TableIndex({
      name: 'IDX_PLAYER_NAME',
      columnNames: ['player_name'],
      isUnique: false
    }));

    await queryRunner.createIndex('player_events', new TableIndex({
      name: 'IDX_PLAYER_RAID_ID',
      columnNames: ['raid_id'],
      isUnique: false
    }));

    await queryRunner.createIndex('player_events', new TableIndex({
      name: 'IDX_EVENT_TYPE',
      columnNames: ['event_type'],
      isUnique: false
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable('player_events');
  }
}
