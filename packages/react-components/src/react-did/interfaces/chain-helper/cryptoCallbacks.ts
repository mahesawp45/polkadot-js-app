// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DidResourceUri, DidVerificationKey, Uid, VerificationKeyRelationship } from '../uid/uidDocument.js';

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
  keyUri: DidResourceUri;
  /**
   * The did key type used for signing.
   */
  keyType: DidVerificationKey['type'];
}

export type SignExtrinsicCallback = (
  signData: SignRequestData
) => Promise<Omit<SignResponseData, 'keyUri'>>;
