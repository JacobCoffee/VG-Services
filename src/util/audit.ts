import { Audit } from '../entities/audit';
import { getRepository } from 'typeorm';
import { JwtUser } from '../entities/user';

export enum AuditOperation {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  TRANSFER = 'transfer'
}

export async function auditEntity(entityType: string, operation: AuditOperation, entity: any, actor: Express.User) {
  try {
    await getRepository(Audit).insert({
      id: null,
      actor: (actor as JwtUser).username,
      audit_event: operation,
      entity_id: entity.id,
      entity_type: entityType,
      entity_data: entity
    });
  } catch(e) {
    console.error(`Failed to audit log: ${entityType} ${operation}`, entity);
    console.error(e);
  }
}