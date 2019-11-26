import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity('raids')
export class Raid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: '64' })
  @Index('IDX_RAID_ID', { unique: true })
  raid_id: string;

  @Column('jsonb')
  instances: Object;

  @Column('jsonb')
  parsed: Object;
}