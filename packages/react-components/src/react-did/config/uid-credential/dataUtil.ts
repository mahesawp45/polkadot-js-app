// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { isHex } from '@polkadot/util';
import { checkAddress } from '@polkadot/util-crypto';

import { ss58Format } from '../uid/ss58Format.js';

export function verifyUidAddress (input: unknown): void {
  if (typeof input !== 'string') {
    throw new Error('Address must be a string');
  }

  if (!checkAddress(input, ss58Format)[0]) {
    throw new Error(`Address is invalid input: ${input}`);
  }
}

export function verifyIsHex (input: unknown, bitLength?: number): void {
  if (!isHex(input, bitLength)) {
    throw new Error(`Address is invalid input: ${input}`);
  }
}
