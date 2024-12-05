// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { ISubmittableResult } from '@polkadot/types/types';

export type Evaluator<SubscriptionType> = (value: SubscriptionType) => boolean | any

export interface TerminationOptions<SubscriptionType> {
  resolveOn: Evaluator<SubscriptionType>
  rejectOn?: Evaluator<SubscriptionType>
  timeout?: number
}

export type ResultEvaluator = Evaluator<ISubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type Options = TerminationOptions<ISubmittableResult>
