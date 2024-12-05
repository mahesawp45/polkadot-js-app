// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { ApiPromise } from '@polkadot/api';
import type { TxWithEvent } from '@polkadot/api-derive/types';
import type { GenericCall, Vec } from '@polkadot/types';
import type { Call, Extrinsic } from '@polkadot/types/interfaces';
import type { Codec, IMethod } from '@polkadot/types/types';
import type { BN } from '@polkadot/util';

import * as ConfigService from './configService.js';

export function isBatch (
  extrinsic: IMethod,
  api?: ApiPromise
): extrinsic is IMethod<[Vec<Call>]> {
  const apiPromise = api ?? ConfigService.get('api');
  const isBatchCall =
    apiPromise.tx.utility?.batch?.is(extrinsic) ||
    apiPromise.tx.utility?.batchAll?.is(extrinsic) ||
    apiPromise.tx.utility?.forceBatch?.is(extrinsic);

  return isBatchCall;
}

export type DidAuthorizationCall =
  | GenericCall<ApiPromise['tx']['uid']['submitDidCall']['args']>
   ;

function isIMethod (arg: unknown): arg is IMethod {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    'args' in arg &&
    'callIndex' in arg
  );
}

export function flattenCalls (call: IMethod, api?: ApiPromise): IMethod[] {
  const apiObject = api ?? ConfigService.get('api');

  // Check if the call is a batch
  if (isBatch(call, apiObject)) {
    return call.args[0].flatMap((c) =>
      isIMethod(c) ? flattenCalls(c as IMethod, apiObject) : []
    );
  }

  // Check if the call is `submitDidCall` and unpack `did_call.call`
  if (apiObject.tx.uid?.submitDidCall?.is(call)) {
    const nestedCall = (call.args[0]) as unknown as { call: IMethod };

    if (isIMethod(nestedCall.call)) {
      return flattenCalls(nestedCall.call, apiObject);
    }
  }

  // Check if the call is `dispatchAs` and unpack the nested call in args[1]
  if (apiObject.tx.uid?.dispatchAs?.is(call)) {
    const nestedCall = (call.args[1]) as unknown as { call: IMethod };

    if (isIMethod(nestedCall.call)) {
      return flattenCalls(nestedCall.call, apiObject);
    }
  }

  // Use type assertion to access `method` and `section` properties
  return [call];
}

export async function retrieveExtrinsicFromBlock (
  api: ApiPromise,
  blockNumber: BN,
  filter: (tx: TxWithEvent) => boolean
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber);
  const successfulExtrinsics = extrinsics.filter(
    ({ dispatchError }) => !dispatchError
  );
  const extrinsicLastOccurrence = successfulExtrinsics.reverse().find(filter);

  return extrinsicLastOccurrence?.extrinsic ?? null;
}
