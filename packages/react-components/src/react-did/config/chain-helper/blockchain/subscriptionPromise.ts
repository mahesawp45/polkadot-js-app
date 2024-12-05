// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type * as SubscriptionPromise from '../../../interfaces/subcriptionPromise.js';

export function makeSubscriptionPromise<SubscriptionType> (
  terminationOptions: SubscriptionPromise.TerminationOptions<SubscriptionType>
): {
    promise: Promise<SubscriptionType>;
    subscription: (value: SubscriptionType) => void;
  } {
  const { rejectOn, resolveOn, timeout = 0 } = { ...terminationOptions };
  let resolve: (value: SubscriptionType) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reject: (reason: any) => void;
  const promise = new Promise<SubscriptionType>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const subscription: (value: SubscriptionType) => void =
    typeof rejectOn === 'function'
      ? (value) => {
        // eslint-disable-next-line no-extra-boolean-cast
        if (Boolean(rejectOn(value))) {
          reject(value);
        }

        if (resolveOn(value) === true) {
          resolve(value);
        }
      }
      : (value) => {
        if (resolveOn(value) === true) {
          resolve(value);
        }
      };

  if (timeout > 0) {
    setTimeout(() => {
      reject(new Error('Subscription promise timed out'));
    }, timeout);
  }

  return { promise, subscription };
}

export function makeSubscriptionPromiseMulti<SubscriptionType> (
  args: SubscriptionPromise.TerminationOptions<SubscriptionType>[]
): {
    promises: Promise<SubscriptionType>[];
    subscription: (value: SubscriptionType) => void;
  } {
  const promises: Promise<SubscriptionType>[] = [];
  const subscriptions: ((value: SubscriptionType) => void)[] = [];

  args.forEach(
    (options: SubscriptionPromise.TerminationOptions<SubscriptionType>) => {
      const { promise, subscription: sub } = makeSubscriptionPromise(options);

      promises.push(promise);
      subscriptions.push(sub);
    }
  );

  function subscription (value: SubscriptionType): void {
    subscriptions.forEach((s) => s(value));
  }

  return { promises, subscription };
}
