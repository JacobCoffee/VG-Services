import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

export interface JwtUser {
  id: number
  username: string
  player_name: string
  roles: string[]
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: '16' })
  player_name: string;

  @Column({ length: '64' })
  @Index('IDX_USERNAME', { unique: true })
  username: string;

  @Column({ length: '64' })
  password: string;

  // Valid roles:
  // SUPERUSER
  // OFFICER
  // USER
  @Column('simple-array')
  roles: string[]
}