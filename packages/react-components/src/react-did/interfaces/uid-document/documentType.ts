// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';

export type InstanceType =
  | 'boolean'
  | 'integer'
  | 'number'
  | 'string'
  | 'array';

export type UidDocumentHash = HexString;

interface TypePattern {
  type: InstanceType;
}

interface StringPattern extends TypePattern {
  type: 'string';
  format?: 'date' | 'time' | 'uri';
  enum?: string[];
  minLength?: number;
  maxLength?: number;
}

interface NumberPattern extends TypePattern {
  type: 'integer' | 'number';
  enum?: number[];
  minimum?: number;
  maximum?: number;
}

interface BooleanPattern extends TypePattern {
  type: 'boolean';
}

interface RefPattern {
  $ref: string;
}

interface ArrayPattern extends TypePattern {
  type: 'array';
  items: BooleanPattern | NumberPattern | StringPattern | RefPattern;
  minItems?: number;
  maxItems?: number;
}

export interface IUidDocument {
  $id: `uid:document:${UidDocumentHash}`;
  $schema: string;
  title: string;
  properties: Record<string, | BooleanPattern
  | NumberPattern
  | StringPattern
  | ArrayPattern
  | RefPattern>;
  type: 'object';
}
