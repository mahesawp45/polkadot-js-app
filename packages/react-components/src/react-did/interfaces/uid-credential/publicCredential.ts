// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { IDelegationNode } from '../delegation.js';
import type { UidDocumentHash } from '../uid-document/documentType.js';
import type { AssetDidUri } from './assetDid.js';
import type { IClaimContents } from './claim.js';

export interface IPublicCredentialInput {
  /*
   * The UidDocument has of the public credential.
   */
  uidDocumentHash: UidDocumentHash;
  /*
   * The optional ID of the delegation node used to issue the credential.
   */
  delegationId: IDelegationNode['id'] | null;
  /*
   * The subject of the credential.
   */
  subject: AssetDidUri;
  /*
   * The content of the credential. The structure must match what the UidDocument specifies.
   */
  claims: IClaimContents;
}

export interface IAssetClaim {
  uidDocumentHash: UidDocumentHash
  contents: IClaimContents
  subject: AssetDidUri
}

export type PartialAssetClaim = Partial<IAssetClaim> &
Pick<IAssetClaim, 'uidDocumentHash'>
