// [object Object]
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/keyring';

import type { KeyringPair } from '@polkadot/keyring/types';
import type { HexString } from '@polkadot/util/types';
import type { Prefix } from '@polkadot/util-crypto/address/types';

export interface UidEncryptionKeypair {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  type: 'x25519';
}

export interface UidKeyringPair extends KeyringPair {
  address: `4${string}`;
  type: Exclude<KeyringPair['type'], 'ethereum'>;
}

export type UidAddress = UidKeyringPair['address']

declare module '@polkadot/keyring' {
  function encodeAddress(key: HexString | Uint8Array | string, ss58Format?: Prefix): string;
  function encodeAddress(key: HexString | Uint8Array | string, ss58Format?: 38): UidAddress;
}
