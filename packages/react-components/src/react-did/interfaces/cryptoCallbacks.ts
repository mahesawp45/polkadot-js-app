// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Uid, UidResourceUri, UidVerificationKey, VerificationKeyRelationship } from './uid/uidDocument.js';

export interface SignRequestData {
  /**
   * Data to be signed.
   */
  data: Uint8Array;

  /**
   * The did key relationship to be used.
   */
  keyRelationship: VerificationKeyRelationship;

  /**
   * The DID to be used for signing.
   */
  did: Uid;
}

export interface SignResponseData {
  /**
   * Result of the signing.
   */
  signature: Uint8Array;
  /**
   * The did key uri used for signing.
   */
  keyUri: UidResourceUri;
  /**
   * The did key type used for signing.
   */
  keyType: UidVerificationKey['type'];
}

export type SignExtrinsicCallback = (
  signData: SignRequestData
) => Promise<Omit<SignResponseData, 'keyUri'>>;

export type SignCallback = (
  signData: SignRequestData
) => Promise<SignResponseData>;
