// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { BN } from '@polkadot/util';
import type { UidAddress } from './address.js';

type AuthenticationKeyType = '00' | '01';
type UidVersion = '' | `v${string}:`;
type LightDidDocumentEncodedData = '' | `:${string}`;

export type Uid =
  | `did:uid:${UidVersion}${UidAddress}`
  | `did:uid:light:${UidVersion}${AuthenticationKeyType}${UidAddress}${LightDidDocumentEncodedData}`;

export type UriFragment = `#${string}`;
export type DidResourceUri = `${Uid}${UriFragment}`;

export type Base58BtcMultibaseString = `z${string}`;

export type UidResourceUri = `${Uid}${UriFragment}`;

export type UidUrl =
  | `${Uid}${UriFragment}`
  // Very broad type definition, mostly for the compiler. Actual regex matching for query params is done where needed.
  | `${Uid}?{string}${UriFragment}`;

export interface VerificationMethod<IdType extends UidUrl | UriFragment = UidUrl> {
  /**
   * The identifier (DID + fragment, i.e., `#<id>`) of the verification method.
   */
  id: IdType;
  /**
   * The type of the verification method. This is fixed for UID DIDs.
   */
  type: 'Multikey';
  /**
   * The controller of the verification method.
   */
  controller: Uid;
  /*
   * The multicodec-prefixed, multibase-encoded verification method's public key.
   */
  publicKeyMultibase: Base58BtcMultibaseString;
}

export interface Service<IdType extends UidUrl | UriFragment = UidUrl> {
  /*
   * The identifier (DID + fragment, i.e., `#<id>`) of the verification method.
   */
  id: IdType;
  /*
   * The set of service types.
   */
  type: string[];
  /*
   * A list of URIs the endpoint exposes its services at.
   */
  serviceEndpoint: string[];
}

export type LightDidSupportedVerificationKeyType = Extract<
VerificationKeyType,
'ed25519' | 'sr25519'
>;

export interface BaseNewDidKey {
  publicKey: Uint8Array;
  type: string;
}

export type NewDidVerificationKey = BaseNewDidKey & {
  type: VerificationKeyType;
};

export type NewLightDidVerificationKey = NewDidVerificationKey & {
  type: LightDidSupportedVerificationKeyType;
};

export type NewDidEncryptionKey = BaseNewDidKey & { type: EncryptionKeyType };

export interface BaseUidKey {
  /**
   * Relative key URI: `#` sign followed by fragment part of URI.
   */
  id: UriFragment;
  /**
   * The public key material.
   */
  publicKey: Uint8Array;
  /**
   * The inclusion block of the key, if stored on chain.
   */
  includedAt?: BN;
  /**
   * The type of the key.
   */
  type: string;
}

const verificationKeyTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const;

export const verificationKeyTypes =
  verificationKeyTypesC as unknown as string[];
export type VerificationKeyType = (typeof verificationKeyTypesC)[number];

export type UidVerificationKey = BaseUidKey & { type: VerificationKeyType };

const encryptionKeyTypesC = ['x25519'] as const;

export const encryptionKeyTypes = encryptionKeyTypesC as unknown as string[];
export type EncryptionKeyType = (typeof encryptionKeyTypesC)[number];

export type DidVerificationKey = BaseDidKey & { type: VerificationKeyType };
export type DidEncryptionKey = BaseDidKey & { type: EncryptionKeyType };
export type DidKey = DidVerificationKey | DidEncryptionKey;

const keyRelationshipsC = [
  'authentication',
  'capabilityDelegation',
  'assertionMethod',
  'keyAgreement'
] as const;

export type KeyRelationship = (typeof keyRelationshipsC)[number];

export type VerificationKeyRelationship = Extract<
KeyRelationship,
'authentication' | 'capabilityDelegation' | 'assertionMethod'
>;

export interface BaseDidKey {
  /**
   * Relative key URI: `#` sign followed by fragment part of URI.
   */
  id: UriFragment;
  /**
   * The public key material.
   */
  publicKey: Uint8Array;
  /**
   * The inclusion block of the key, if stored on chain.
   */
  includedAt?: BN;
  /**
   * The type of the key.
   */
  type: string;
}

export interface DidServiceEndpoint {
  /**
   * Relative endpoint URI: `#` sign followed by fragment part of URI.
   */
  id: UriFragment;
  /**
   * A list of service types the endpoint exposes.
   */
  type: string[];
  /**
   * A list of URIs the endpoint exposes its services at.
   */
  serviceEndpoint: string[];
}

export interface DidSignature {
  keyUri: DidResourceUri;
  signature: string;
}

export interface UidDocument {
  uri: Uid;

  authentication: [DidVerificationKey];
  assertionMethod?: [DidVerificationKey];
  capabilityDelegation?: [DidVerificationKey];
  keyAgreement?: DidEncryptionKey[];

  service?: DidServiceEndpoint[];
}
