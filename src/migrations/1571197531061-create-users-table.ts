import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class createUsersTable1571197531061 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.createTable(new Table({
      name: 'users',
      columns: [{
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },{
        name: 'username',
        type: 'varchar(64)'
      },{
        name: 'password',
        type: 'varchar(64)'
      },{
        name: 'player_name',
        type: 'varchar(16)'
      },{
        name: 'roles',
        type: 'text'
      }]
    }), true);

    await queryRunner.createIndex("users", new TableIndex({
      name: "IDX_USERNAME",
      isUnique: true,
      columnNames: ["username"]
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropTable('users');
  }
}
