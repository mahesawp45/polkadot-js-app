// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { IDelegationNode } from './delegation.js';
import type { Uid } from './uid/uidDocument.js';
import type { Hash } from './uid-credential/credential.js';
import type { UidDocumentHash } from './uid-document/documentType.js';

import { ICredential } from './uid-credential/credential.js';

export interface IAttestation {
  vcHash: Hash;
  uidDocumentHash: UidDocumentHash;
  owner: Uid;
  delegationId: IDelegationNode['id'] | null;
  revoked: boolean;
}
