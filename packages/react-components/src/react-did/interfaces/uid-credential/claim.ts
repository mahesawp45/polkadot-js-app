// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Uid } from '../uid/uidDocument.js';
import type { UidDocumentHash } from '../uid-document/documentType.js';

type ClaimPrimitives = string | number | boolean;

export interface IClaimContents {
  [key: string]:
  | ClaimPrimitives
  | IClaimContents
  | (ClaimPrimitives | IClaimContents)[];
}

export interface IClaim {
  uidDocumentHash: UidDocumentHash;
  contents: IClaimContents;
  owner: Uid;
}

/**
 * The minimal partial claim from which a JSON-LD representation can be built.
 */
export type PartialClaim = Partial<IClaim> & Pick<IClaim, 'uidDocumentHash'>;
