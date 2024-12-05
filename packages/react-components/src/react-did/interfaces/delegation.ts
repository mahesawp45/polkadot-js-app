// Copyright 2017-2024 @polkadot/app-accounts authors & contributors
// SPDX-License-Identifier: Apache-2.0

// This is for the use of `Ledger`
//
/* eslint-disable deprecation/deprecation */

import type { Uid } from './uid/uidDocument.js';
import type { UidDocumentHash } from './uid-document/documentType.js';

/* eslint-disable no-bitwise */
export const Permission = {
  ATTEST: 1 << 0, // 0001
  DELEGATE: 1 << 1 // 0010
} as const;
export type PermissionType = (typeof Permission)[keyof typeof Permission];

export interface IDelegationNode {
  id: string;
  hierarchyId: IDelegationNode['id'];
  parentId?: IDelegationNode['id'];
  childrenIds: IDelegationNode['id'][];
  account: Uid;
  permissions: PermissionType[];
  revoked: boolean;
}

export interface IDelegationHierarchyDetails {
  id: IDelegationNode['id'];
  uidDocumentHash: UidDocumentHash;
}
