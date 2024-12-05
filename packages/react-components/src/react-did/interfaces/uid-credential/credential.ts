// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';
import type { IDelegationNode } from '../delegation.js';
import type { DidSignature, Uid } from '../uid/uidDocument.js';
import type { IUidDocument } from '../uid-document/documentType.js';

import { UidDocumentHash } from '../uid-document/documentType.js';

export type Hash = HexString;

export interface NonceHash {
  hash: Hash;
  nonce?: string;
}

export type IVcStatus = 'active' | 'revoked';

type ProofPrimitives = string | number | boolean;

export interface IProofContents {
  [key: string]:
  | ProofPrimitives
  | IProofContents
  | (ProofPrimitives | IProofContents)[];
}

export interface Ivc_metadata {
  proofNonceMap: Record<Hash, string>;
  proofHashes: Hash[];
  delegationId: IDelegationNode['id'] | null;
  legitimations: ICredential[];
}

export interface ICredential {
  uid_vc: `uid:vc:${Hash}`;
  uid_document: IUidDocument['$id'];
  uid_controller: Uid;
  doc_type: IUidDocument['title'];
  uid_subject: Uid;
  proof: IProofContents;
  vc_status: IVcStatus;
  vc_metadata: Ivc_metadata;
}

export type PartialClaim = Partial<ICredential> &
Pick<ICredential, 'uid_document'>;

export interface ICredentialPresentation extends ICredential {
  claimerSignature: DidSignature & { challenge?: string };
}

export interface UidPublishedCredentialV1 {
  credential: ICredential;
  metadata?: {
    label?: string;
    blockNumber?: number;
    txHash?: HexString;
  };
}

export type UidPublishedCredentialCollectionV1 = UidPublishedCredentialV1[];

export const UidPublishedCredentialCollectionV1Type =
  'UidPublishedCredentialCollectionV1';
