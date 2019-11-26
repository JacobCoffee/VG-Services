import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit')
export class Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: '64' })
  actor: string;

  @Column({ length: '32' })
  audit_event: string;

  @Column()
  entity_id: number;

  @Column({ length: '64' })
  entity_type: string;

  @Column('json')
  entity_data: Object;

  @Column({ type: 'timestamp', default: () => 'now()' })
  timestamp: Date
}