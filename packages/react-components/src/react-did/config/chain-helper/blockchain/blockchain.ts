// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { AnyNumber, ISubmittableResult } from '@polkadot/types/types';
import type { Options, ResultEvaluator } from '../../../interfaces/subcriptionPromise.js';

import { SubmittableResult } from '@polkadot/api';

import * as ConfigService from '../configService.js';
import * as ErrorHandler from '../errorHandling/errorHandler.js';
import { makeSubscriptionPromise } from './subscriptionPromise.js';

const log = ConfigService.LoggingFactory.getLogger('Blockchain');

export const TxOutdated = 'Transaction is outdated';
export const TxPriority = 'Priority is too low:';
export const TxDuplicate = 'Transaction Already Imported';

export function IS_READY (result: ISubmittableResult): boolean {
  return result.status.isReady;
}

export function IS_IN_BLOCK (result: ISubmittableResult): boolean {
  return result.isInBlock;
}

export function EXTRINSIC_EXECUTED (result: ISubmittableResult): boolean {
  return ErrorHandler.extrinsicSuccessful(result);
}

export function IS_FINALIZED (result: ISubmittableResult): boolean {
  return result.isFinalized;
}

export function IS_ERROR (
  result: ISubmittableResult
): boolean | Error | undefined {
  return result.isError || result.internalError;
}

export function EXTRINSIC_FAILED (result: ISubmittableResult): boolean {
  return ErrorHandler.extrinsicFailed(result);
}

function defaultResolveOn (): ResultEvaluator {
  return ConfigService.isSet('submitTxResolveOn')
    ? ConfigService.get('submitTxResolveOn')
    : IS_FINALIZED;
}

export async function submitSignedTx (
  tx: SubmittableExtrinsic,
  opts: Partial<Options> = {}
): Promise<ISubmittableResult> {
  const { rejectOn = (result: ISubmittableResult) =>
    EXTRINSIC_FAILED(result) || IS_ERROR(result),
  resolveOn = defaultResolveOn() } = opts;

  const api = ConfigService.get('api');

  if (!api.hasSubscriptions) {
    throw new Error('Subscriptions not supported');
  }

  log.info(`Submitting ${tx.method}`);
  const { promise, subscription } = makeSubscriptionPromise({
    ...opts,
    resolveOn,
    rejectOn
  });

  let latestResult: SubmittableResult | undefined;
  const unsubscribe = await tx.send((result) => {
    latestResult = result;
    subscription(result);
  });

  function handleDisconnect (): void {
    const result = new SubmittableResult({
      events: latestResult?.events || [],
      internalError: new Error('connection error'),
      status:
        latestResult?.status ||
        api.registry.createType('ExtrinsicStatus', 'future'),
      txHash: api.registry.createType('Hash')
    });

    subscription(result);
  }

  api.once('disconnected', handleDisconnect);

  try {
    return await promise;
  } catch (e) {
    throw ErrorHandler.getExtrinsicError(e as ISubmittableResult) || e;
  } finally {
    unsubscribe();
    api.off('disconnected', handleDisconnect);
  }
}

export const dispatchTx = submitSignedTx;

export async function signAndSubmitTx (
  tx: SubmittableExtrinsic,
  signer: KeyringPair,
  { tip, ...opts }: Partial<Options> & Partial<{ tip: AnyNumber }> = {}
): Promise<ISubmittableResult> {
  const signedTx = await tx.signAsync(signer, { tip });

  return submitSignedTx(signedTx, opts);
}
