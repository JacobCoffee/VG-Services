import {MigrationInterface, QueryRunner} from "typeorm";

// I camelCased literally one out of all the event_data fields like a complete muppet
export class rewriteItemId1571880941036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`update player_events set event_data = event_data - 'itemId' || jsonb_build_object('item_id', event_data->'itemId') where event_data ? 'itemId';`)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`update player_events set event_data = event_data - 'item_id' || jsonb_build_object('itemId', event_data->'item_id') where event_data ? 'item_id';`)
  }
}
