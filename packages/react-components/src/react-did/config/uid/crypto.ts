// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';
import type { UidEncryptionKeypair, UidKeyringPair } from '../../interfaces/uid/address.js';

import nacl from 'tweetnacl';
import { v4 as uuid } from 'uuid';

import { Keyring } from '@polkadot/api';
import { isString, stringToU8a, u8aToHex, u8aToU8a } from '@polkadot/util';
import { blake2AsHex, blake2AsU8a, randomAsU8a, signatureVerify } from '@polkadot/util-crypto';

import * as jsonabc from '../uid-document/utils/jsonabc.js';
import { ss58Format } from './ss58Format.js';

export type CryptoInput = Buffer | Uint8Array | string;

export function coToUInt8 (
  input: CryptoInput | null | undefined,
  hexAsString = false
): Uint8Array {
  if (hexAsString && isString(input)) {
    return stringToU8a(input);
  }

  return u8aToU8a(input);
}

export type BitLength = 64 | 128 | 256 | 384 | 512;

export function hash (value: CryptoInput, bitLength?: BitLength): Uint8Array {
  return blake2AsU8a(value, bitLength);
}

export function naclBoxPairFromSecret (secret: Uint8Array): nacl.BoxKeyPair {
  return nacl.box.keyPair.fromSecretKey(secret);
}

export function makeKeypairFromUri<
  KeyType extends UidKeyringPair['type'] = 'ed25519'
> (uri: string, type?: KeyType): UidKeyringPair & { type: KeyType } {
  const keyring = new Keyring({ ss58Format, type });

  return keyring.addFromUri(uri) as UidKeyringPair & { type: KeyType };
}

export function makeKeypairFromAddress<
  KeyType extends UidKeyringPair['type'] = 'ed25519'
> (address: string, type?: KeyType): UidKeyringPair & { type: KeyType } {
  const keyring = new Keyring({ ss58Format, type });

  return keyring.addFromAddress(address) as UidKeyringPair & { type: KeyType };
}

export function makeEncryptionKeypairFromSeed (
  seed = randomAsU8a(32)
): UidEncryptionKeypair {
  return {
    ...naclBoxPairFromSecret(seed),
    type: 'x25519'
  };
}

export function hashStr (value: CryptoInput): HexString {
  return u8aToHex(hash(value));
}

export function encodeObjectAsStr (
  value: Record<string, any> | string | number | boolean
): string {
  const input =
    // eslint-disable-next-line no-nested-ternary
    typeof value === 'object' && value !== null
      ? JSON.stringify(jsonabc.sortObj(value))
      : // eslint-disable-next-line no-nested-ternary
      typeof value === 'number' && value !== null
        ? value.toString()
        : typeof value === 'boolean' && value !== null
          ? JSON.stringify(value)
          : value;

  return input.normalize('NFC');
}

export type Hasher = (value: string, nonce?: string) => HexString;

export interface HashingOptions {
  nonces?: Record<string, string>;
  nonceGenerator?: (key: string) => string;
  hasher?: Hasher;
}

export function saltedBlake2b256 (value: string, nonce = ''): HexString {
  return blake2AsHex(nonce + value, 256);
}

export function hashStatements (
  statements: string[],
  options: HashingOptions = {}
): {
    digest: HexString;
    statement: string;
    saltedHash: HexString;
    nonce: string;
  }[] {
  // apply defaults
  const defaults = {
    hasher: saltedBlake2b256,
    nonceGenerator: () => uuid()
  };
  const hasher = options.hasher || defaults.hasher;
  const nonceGenerator = options.nonceGenerator || defaults.nonceGenerator;
  // set source for nonces
  const { nonces } = options;
  const getNonce: HashingOptions['nonceGenerator'] =
    typeof nonces === 'object' ? (key) => nonces[key] : nonceGenerator;

  // iterate over statements to produce salted hashes
  return statements.map((statement) => {
    // generate unsalted digests from statements as a first step
    const digest = hasher(statement);
    // if nonces were passed, they would be mapped to the statement via its digest
    const nonce = getNonce(digest);
    // to simplify validation, the salted hash is computed over unsalted hash (nonce key) & nonce
    const saltedHash = hasher(digest, nonce);

    return { digest, saltedHash, nonce, statement };
  });
}

export type Address = string;

export function verify (
  message: CryptoInput,
  signature: CryptoInput,
  addressOrPublicKey: Address | HexString | Uint8Array
): void {
  if (signatureVerify(message, signature, addressOrPublicKey).isValid !== true) {
    throw new Error('Signature unverifiable');
  }
}
