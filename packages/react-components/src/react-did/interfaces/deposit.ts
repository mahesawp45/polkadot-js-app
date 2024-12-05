// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { BN } from '@polkadot/util';
import type { UidAddress } from './uid/address.js';

export interface Deposit {
  owner: UidAddress;
  amount: BN;
}
