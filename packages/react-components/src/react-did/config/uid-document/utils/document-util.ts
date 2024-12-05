// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';

import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';

import * as jsonabc from './jsonabc.js';

export type BitLength = 64 | 128 | 256 | 384 | 512;
export type CryptoInput = Buffer | Uint8Array | string;

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

export function hash (value: CryptoInput, bitLength?: BitLength): Uint8Array {
  return blake2AsU8a(value, bitLength);
}

export function hashStr (value: CryptoInput): HexString {
  return u8aToHex(hash(value));
}
