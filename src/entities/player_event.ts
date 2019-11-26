import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('player_events')
export class PlayerEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: '64' })
  raid_id: string;

  @Column({ length: '16' })
  player_name: string;

  @Column()
  gpp: number;

  @Column({ length: '32' })
  event_type: string;

  @Column('json')
  event_data: Object;
}
