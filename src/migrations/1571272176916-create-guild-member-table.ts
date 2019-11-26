import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class createGuildMemberTable1571272176916 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(new Table({
      name: 'guild_members',
      columns: [{
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },{
        name: 'player_name',
        type: 'varchar(16)'
      },{
        name: 'officer_note',
        type: 'varchar(256)'
      },{
        name: 'class',
        type: 'varchar(16)'
      },{
        name: 'level',
        type: 'int'
      },{
        name: 'rank_index',
        type: 'int'
      },{
        name: 'rank',
        type: 'varchar(32)'
      },{
        name: 'active',
        type: 'bool',
        default: true
      }]
    }), true);

    await queryRunner.createIndex('guild_members', new TableIndex({
      name: "IDX_GUILD_PLAYER_NAME",
      isUnique: true,
      columnNames: ["player_name"]
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable('guild_members');
  }
}
