// Helpers for processing raid ASTs
// Opinionated, not generalized
import * as parser from 'luaparse';
import { TableConstructorExpression } from 'luaparse';

// Gets a lua variable assignment relative to the provided Chunk
export function getAssignment(node: parser.Chunk, identifierName: String, errors: string[]) {
  if(node) {
    const assignments = node.body.filter((it):it is parser.AssignmentStatement => {
      return it.type === 'AssignmentStatement';
    });

    if(!assignments.length) {
      errors.push(`No variable assignments in provided Chunk: ${node}`);
      return;
    }

    const identifierAssignment = assignments.find(it =>
      it.variables.length === 1 &&
      it.variables[0].type === 'Identifier' &&
      (it.variables[0] as parser.Identifier).name === identifierName
    );

    if(!identifierAssignment) {
      errors.push(`Cannot find assignment for identifier: ${identifierName}`);
      return;
    }

    return identifierAssignment;
  }
}

// Given a list of statements, finds the first table expression
export function findTable(nodes: parser.Expression[], errors: string[]) {
  if(nodes) {
    const table = nodes.find((it):it is parser.TableConstructorExpression => it.type === 'TableConstructorExpression');
    if(!table) {
      errors.push(`No table assignments in expression list: ${nodes}`);
      return;
    }
    return table;
  }
}

// If a TableConstructorExpression's fields are TableValues, it's a list
export function getList(node: parser.TableConstructorExpression, errors: string[]) {
  if(node) {
    return node.fields.filter((it):it is parser.TableValue => it.type === 'TableValue')
  }
}

// If a TableConstructorExpression's fields are TableKeys, it's a dictionary
export function getDict(node: parser.TableConstructorExpression, errors: string[]) {
  if(node) {
    return node.fields.filter((it):it is StringLiteralTableKey => it.type === 'TableKey' && it.key.type === 'StringLiteral');
  }
}

// Only finds StringLiteral keys
export interface StringLiteralTableKey extends parser.TableKey {
  key: parser.StringLiteral
}

type RaidTableValue = parser.TableConstructorExpression | parser.StringLiteral | parser.NumericLiteral

export function getDictValue(nodes: parser.TableKey[], key: string, errors: string[]) {
  if(nodes) {
    const found = nodes.filter((it):it is StringLiteralTableKey => it.key.type === 'StringLiteral').find(it => it.key.value === key);
    if(!found) {
      errors.push(`Could not find key ${key} in dict: ${nodes}`);
      return;
    }
    if(isRaidTableValue(found.value)) {
      return found.value;
    } else {
      errors.push(`Value of table key ${key} is not a valid RaidTableValue: ${found}`);
    }
  }
}

export function isRaidTableValue(node: parser.Expression): node is RaidTableValue {
  return ['TableConstructorExpression', 'StringLiteral', 'NumericLiteral'].some(it => node.type === it);
}

export function isTableConstructorExpression(node: parser.Expression): node is parser.TableConstructorExpression {
  return node.type === 'TableConstructorExpression';
}

export function isStringLiteral(node: parser.Expression): node is parser.StringLiteral {
  return node.type === 'StringLiteral';
}

export function isNumericLiteral(node: parser.Expression): node is parser.NumericLiteral {
  return node.type === 'NumericLiteral';
}
