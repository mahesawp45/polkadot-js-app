// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DispatchError } from '@polkadot/types/interfaces';
import type { ISubmittableResult, RegistryError } from '@polkadot/types/types';

export function extrinsicFailed (extrinsicResult: ISubmittableResult): boolean {
  return extrinsicResult.events.some((eventRecord) => {
    const { method, section } = eventRecord.event;

    return section === 'system' && method === 'ExtrinsicFailed'; // as done in https://github.com/polkadot-js/apps/blob/51835328db5f0eb90a9efcc7bf5510704a7ab279/packages/react-components/src/Status/Queue.tsx
  });
}

export function extrinsicSuccessful (
  extrinsicResult: ISubmittableResult
): boolean {
  return extrinsicResult.events.some((eventRecord) => {
    const { method, section } = eventRecord.event;

    return section === 'system' && method === 'ExtrinsicSuccess';
  });
}

export function getExtrinsicError (
  extrinsicResult: ISubmittableResult
): RegistryError | DispatchError | null {
  const errorEvent = extrinsicResult.dispatchError;

  if (errorEvent && errorEvent.isModule) {
    const moduleError = errorEvent.asModule;

    try {
      return moduleError.registry.findMetaError(moduleError);
    } catch {
      // handled with last return
    }
  }

  return errorEvent || null;
}
