import { Entity, Column, PrimaryGeneratedColumn, Unique, Index } from "typeorm";

@Entity('guild_members')
export class GuildMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: '16' })
  @Index('IDX_PLAYER_NAME', { unique: false })
  player_name: string;

  @Column({ length: '256' })
  officer_note: string;

  @Column({ length: '16' })
  class: string;

  @Column()
  level: number;

  @Column()
  rank_index: number;

  @Column({ length: '32' })
  rank: string;

  @Column({ type: 'bool', default: true })
  active: boolean;
}