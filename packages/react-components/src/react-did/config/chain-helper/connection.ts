// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { ApiOptions } from '@polkadot/api/types';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import * as ConfigService from './configService.js';

export async function init<K extends Partial<ConfigService.configOpts>> (
  configs?: K
): Promise<void> {
  ConfigService.set(configs || {});
  await cryptoWaitReady();
}

export async function connect (
  blockchainRpcWsUrl: string,
  apiOpts: Omit<ApiOptions, 'provider'> = {}
): Promise<ApiPromise> {
  const provider = new WsProvider(blockchainRpcWsUrl);
  const api = await ApiPromise.create({
    provider,
    ...apiOpts
  });

  await init({ api });

  return api.isReadyOrError;
}

export async function disconnect (): Promise<boolean> {
  if (!ConfigService.isSet('api')) {
    return false;
  }

  const api = ConfigService.get('api');

  ConfigService.unset('api');
  await api.disconnect();

  return true;
}
