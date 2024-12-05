// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { UidAddress, UidKeyringPair } from '../../interfaces/uid/address.js';
import type { Base58BtcMultibaseString, Uid, UidUrl, UidVerificationKey, UriFragment, VerificationMethod } from '../../interfaces/uid/uidDocument.js';

import * as varint from 'varint';

import { isHex, u8aConcat } from '@polkadot/util';
import { base58Encode, blake2AsU8a, checkAddress, encodeAddress } from '@polkadot/util-crypto';

import * as DataUtil from '../uid-credential/dataUtil.js';
import { ss58Format } from './ss58Format.js';
import { parse } from './uid.config.js';

const FULL_DID_LATEST_VERSION = 1;

const signingMethodTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const;

export const signingMethodTypes = signingMethodTypesC as unknown as string[];
export type DidSigningMethodType = (typeof signingMethodTypesC)[number];

const encryptionMethodTypesC = ['x25519'] as const;

export const encryptionMethodTypes =
  encryptionMethodTypesC as unknown as string[];
export type DidEncryptionMethodType = (typeof encryptionMethodTypesC)[number];

export type DidVerificationMethodType =
  | DidSigningMethodType
  | DidEncryptionMethodType;

export function verifyUidAddress (input: unknown): void {
  if (typeof input !== 'string') {
    throw new Error('Address must be a string');
  }

  if (!checkAddress(input, ss58Format)[0]) {
    throw new Error(`Address is invalid input: ${input}`);
  }
}

export function isUidAddress (input: unknown): input is UidAddress {
  try {
    verifyUidAddress(input);

    return true;
  } catch {
    return false;
  }
}

interface DecodedVerificationMethod {
  publicKey: Uint8Array;
  keyType: DidVerificationMethodType;
}

export function didKeyToVerificationMethod<IdType extends UidUrl | UriFragment> (
  controller: VerificationMethod['controller'],
  id: IdType,
  { keyType, publicKey }: DecodedVerificationMethod
): VerificationMethod<IdType> {
  const { publicKeyMultibase } = encodeMultibaseKeypair({
    publicKey,
    type: keyType
  });

  return {
    controller,
    id,
    type: 'Multikey',
    publicKeyMultibase
  };
}

export interface TypedKeypair<KeyTypes extends string> {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  type: KeyTypes;
}

type KeyTypeString = 'ed25519' | 'sr25519' | 'x25519' | 'secp256k1';

export type KnownTypeString = UidKeyringPair['type'] | KeyTypeString;

export type MultibasePublicKey = Pick<VerificationMethod, 'publicKeyMultibase'>;
export interface MultibaseSecretKey {
  secretKeyMultibase: Base58BtcMultibaseString;
}
export type MultibaseKeyPair = MultibasePublicKey & MultibaseSecretKey;

const MULTICODEC_SECP256K1_PREFIXES = [0xe7, 0x1301] as const;
const MULTICODEC_X25519_PREFIXES = [0xec, 0x1302] as const;
const MULTICODEC_ED25519_PREFIXES = [0xed, 0x1300] as const;
const MULTICODEC_SR25519_PREFIXES = [0xef, 0x1303] as const;

export function encodeMultibaseKeypair(
  args: TypedKeypair<KnownTypeString>
): MultibaseKeyPair;
/**
 * Create a Multikey representation of a keypair's public key, encoded in multibase-base58-btc, given its type and public key bytes.
 *
 * @param keypair The input keypair to encode as Multikey.
 * @param keypair.type The keypair type indicated by a type string.
 * @param keypair.publicKey The keypair's public key bytes.
 * @returns The Multikey representation (i.e., multicodec-prefixed, then base58-btc multibase encoded) of the public key.
 */
export function encodeMultibaseKeypair(
  args: Pick<TypedKeypair<KnownTypeString>, 'publicKey' | 'type'>
): MultibasePublicKey;

// eslint-disable-next-line jsdoc/require-jsdoc -- Docs are provided to overloads.
export function encodeMultibaseKeypair ({ publicKey,
  secretKey,
  type }: TypedKeypairWithOptionalSecretKey<KnownTypeString>): MultibasePublicKey &
  Partial<MultibaseSecretKey> {
  const [multiCodecPublicKeyPrefix, multiCodedSecretKeyPrefix] =
    mapTypeStringToPrefixes(type);

  const keypair: MultibasePublicKey & Partial<MultibaseSecretKey> = {
    publicKeyMultibase: multibase58BtcKeyBytesEncoding(
      publicKey,
      multiCodecPublicKeyPrefix
    )
  };

  if (secretKey) {
    keypair.secretKeyMultibase = multibase58BtcKeyBytesEncoding(
      secretKey,
      multiCodedSecretKeyPrefix
    );
  }

  return keypair;
}

function mapTypeStringToPrefixes (type: KnownTypeString): [number, number] {
  switch (type) {
    case 'ecdsa':
    case 'secp256k1':
    case 'sr25519':
      return [...MULTICODEC_SR25519_PREFIXES];
    case 'x25519':
      return [...MULTICODEC_X25519_PREFIXES];
    case 'ed25519':
      return [...MULTICODEC_ED25519_PREFIXES];
    default:
      throw new Error(`The provided key type "${type}" is not supported.`);
  }
}

function multibase58BtcKeyBytesEncoding (
  key: Uint8Array,
  keyPrefix: number
): Base58BtcMultibaseString {
  const varintEncodedPrefix = varint.encode(keyPrefix);
  const prefixedKey = u8aConcat(varintEncodedPrefix, key);
  const base58BtcEncodedKey = base58Encode(prefixedKey);

  return `z${base58BtcEncodedKey}`;
}

const KEY_LENGTH_ECDSA = 33;
const KEY_LENGTH_OTHER = 32;

type TypedKeypairWithOptionalSecretKey<KeyTypes extends string> = Partial<
Pick<TypedKeypair<KeyTypes>, 'secretKey'>
> &
Pick<TypedKeypair<KeyTypes>, 'publicKey' | 'type'>;

export function getAddressByKey ({ publicKey,
  type }: Pick<UidVerificationKey, 'publicKey' | 'type'>): UidAddress {
  if (type === 'ed25519' || type === 'sr25519') {
    return encodeAddress(publicKey, ss58Format);
  }

  // Otherwise it’s ecdsa.
  // Taken from https://github.com/polkadot-js/common/blob/master/packages/keyring/src/pair/index.ts#L44
  const address = publicKey.length > 32 ? blake2AsU8a(publicKey) : publicKey;

  return encodeAddress(address, ss58Format);
}

export function getFullDidUri (
  didOrAddress: Uid | UidAddress,
  version = FULL_DID_LATEST_VERSION
): Uid {
  const address = isUidAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress).address;
  const versionString = version === 1 ? '' : `v${version}`;

  return `did:uid:${versionString}${address}` as Uid;
}

export function getFullDidUriFromKey (
  key: Pick<UidVerificationKey, 'publicKey' | 'type'>
): Uid {
  const address = getAddressByKey(key);

  return getFullDidUri(address);
}

export function validateUri (
  input: unknown,
  expectType?: 'Did' | 'ResourceUri'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`);
  }

  const { address, fragment } = parse(input as Uid);

  if (
    fragment &&
    (expectType === 'Did' ||
      // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
      (typeof expectType === 'boolean' && expectType === false))
  ) {
    throw new Error(
      'Expected a Uid DidUri but got a DidResourceUri (containing a #fragment)'
    );
  }

  if (!fragment && expectType === 'ResourceUri') {
    throw new Error(
      'Expected a Uid DidResourceUri (containing a #fragment) but got a DidUri'
    );
  }

  DataUtil.verifyUidAddress(address);
}

export function isSameSubject (didA: Uid, didB: Uid): boolean {
  return parse(didA).address === parse(didB).address;
}
