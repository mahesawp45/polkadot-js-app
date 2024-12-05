// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuid } from 'uuid';

import { hashStr } from '../../uid/crypto.js';

/**
 * Generates a H256 compliant UUID.
 *
 * @returns The hashed uuid.
 */
export function generate (): string {
  return hashStr(uuid());
}
