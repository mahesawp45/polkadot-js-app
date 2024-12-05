// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DidEncryptionKey, DidResourceUri, DidServiceEndpoint, DidVerificationKey, EncryptionKeyType, Uid, VerificationKeyType } from './uidDocument.js';

export type ConformingDidDocumentKeyType =
  | 'Ed25519VerificationKey2018'
  | 'Sr25519VerificationKey2020'
  | 'EcdsaSecp256k1VerificationKey2019'
  | 'X25519KeyAgreementKey2019';

export interface ConformingDidKey {
  /**
   * The full key URI, in the form of <did>#<key_id>.
   */
  id: DidResourceUri;
  /**
   * The key controller, in the form of <did_subject>.
   */
  controller: Uid;
  /**
   * The base58-encoded public component of the key.
   */
  publicKeyBase58: string;
  /**
   * The key type signalling the intended signing/encryption algorithm for the use of this key.
   */
  type: ConformingDidDocumentKeyType;
}

export type ConformingDidServiceEndpoint = Omit<DidServiceEndpoint, 'id'> & {
  /**
   * The full service URI, in the form of <did>#<service_id>.
   */
  id: DidResourceUri;
};

export interface ConformingDidDocument {
  id: Uid;
  verificationMethod: ConformingDidKey[];
  authentication: [DidVerificationKey['id']];
  assertionMethod?: [DidVerificationKey['id']];
  keyAgreement?: [DidEncryptionKey['id']];
  capabilityDelegation?: [DidVerificationKey['id']];
  service?: ConformingDidServiceEndpoint[];
  alsoKnownAs?: [`w3n:${string}`];
  '@context'?: string[];
}

export const verificationKeyTypesMap: Record<
VerificationKeyType,
ConformingDidDocumentKeyType
> = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019'
};

export const encryptionKeyTypesMap: Record<
EncryptionKeyType,
ConformingDidDocumentKeyType
> = {
  x25519: 'X25519KeyAgreementKey2019'
};

export type JsonLDDidDocument = ConformingDidDocument & { '@context': string[] }
