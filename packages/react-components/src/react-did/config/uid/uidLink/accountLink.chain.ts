// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { KeyringPair } from '@polkadot/keyring/types';
import type { HexString } from '@polkadot/util/types';
import type { UidAddress } from '../../../interfaces/uid/address.js';

export type SubstrateAddress = KeyringPair['address']

export type EthereumAddress = HexString

export type Address = UidAddress | SubstrateAddress | EthereumAddress
