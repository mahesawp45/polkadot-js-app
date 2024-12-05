// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import type { SubmittableExtrinsicFunction } from '@polkadot/api/types';
import type { Extrinsic } from '@polkadot/types/interfaces';
import type { Option } from '@polkadot/types-codec';
import type { DidDidDetails } from '../../../interfaces/augment-api/lookup.js';
import type { SignExtrinsicCallback } from '../../../interfaces/chain-helper/cryptoCallbacks.js';
import type { UidAddress } from '../../../interfaces/uid/address.js';
import type { Uid, VerificationKeyRelationship } from '../../../interfaces/uid/uidDocument.js';

import { BN } from '@polkadot/util';

import { get } from '../../chain-helper/configService.js';
import { generateDidAuthenticatedTx, toChain } from '../uid.chain.js';
import { parse } from '../uid.config.js';
import { documentFromChain } from '../uid.rpc.js';

const methodMapping: Record<string, VerificationKeyRelationship | undefined> = {
  verification: 'assertionMethod', // Changed from verifier
  credential: 'assertionMethod', // Changed from uid docuement
  delegation: 'capabilityDelegation',
  uid: 'authentication', // Changed from did
  'uid.create': undefined, // Update method names for uid
  'uid.submitDidCall': undefined,
  didLookup: 'authentication', // You may need to rename this if changed
  dipProvider: 'authentication',
  publicCredentials: 'assertionMethod',
  web3Names: 'authentication'
};

function getKeyRelationshipForMethod (
  call: Extrinsic['method']
): VerificationKeyRelationship | undefined {
  const { method, section } = call;

  // get the VerificationKeyRelationship of a batched call
  if (
    section === 'utility' &&
    ['batch', 'batchAll', 'forceBatch'].includes(method) &&
    call.args[0].toRawType() === 'Vec<Call>'
  ) {
    // map all calls to their VerificationKeyRelationship and deduplicate the items
    return (call.args[0] as unknown as Extrinsic['method'][])
      .map(getKeyRelationshipForMethod)
      .reduce((prev, value) => (prev === value ? prev : undefined));
  }

  const signature = `${section}.${method}`;

  if (signature in methodMapping) {
    return methodMapping[signature];
  }

  return methodMapping[section];
}

const maxNonceValue = new BN(2).pow(new BN(64)).subn(1);

function increaseNonce (currentNonce: BN, increment = 1): BN {
  // Wrap around the max u64 value when reached.
  // FIXME: can we do better than this? Maybe we could expose an RPC function for this, to keep it consistent over time.
  return currentNonce.eq(maxNonceValue)
    ? new BN(increment)
    : currentNonce.addn(increment);
}

async function getNextNonce (did: Uid): Promise<BN> {
  const api = get('api');
  const queried = await api.query.uid.did(toChain(did)) as Option<DidDidDetails>;
  const currentNonce = queried.isSome
    ? documentFromChain(queried.unwrap()).lastTxCounter
    : new BN(0);

  return increaseNonce(currentNonce);
}

export function getKeyRelationshipForTx (
  extrinsic: Extrinsic
): VerificationKeyRelationship | undefined {
  return getKeyRelationshipForMethod(extrinsic.method);
}

export async function authorizeTx (
  did: Uid,
  extrinsic: Extrinsic,
  sign: SignExtrinsicCallback,
  submitterAccount: UidAddress,
  { txCounter }: {
    txCounter?: BN;
  } = {}
): Promise<SubmittableExtrinsic> {
  if (parse(did).type === 'light') {
    throw new Error(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    );
  }

  const keyRelationship = getKeyRelationshipForTx(extrinsic);

  if (keyRelationship === undefined) {
    throw new Error('No key relationship found for extrinsic');
  }

  return generateDidAuthenticatedTx({
    did,
    keyRelationship,
    sign,
    call: extrinsic,
    txCounter: txCounter || (await getNextNonce(did)),
    submitter: submitterAccount
  });
}

type GroupedExtrinsics = {
  extrinsics: Extrinsic[]
  keyRelationship: VerificationKeyRelationship
}[]

function groupExtrinsicsByKeyRelationship (
  extrinsics: Extrinsic[]
): GroupedExtrinsics {
  const [first, ...rest] = extrinsics.map((extrinsic) => {
    const keyRelationship = getKeyRelationshipForTx(extrinsic);

    if (!keyRelationship) {
      throw new Error(
        'Can only batch extrinsics that require a DID signature'
      );
    }

    return { extrinsic, keyRelationship };
  });

  const groups: GroupedExtrinsics = [
    {
      extrinsics: [first.extrinsic],
      keyRelationship: first.keyRelationship
    }
  ];

  rest.forEach(({ extrinsic, keyRelationship }) => {
    const currentGroup = groups[groups.length - 1];
    const useCurrentGroup = keyRelationship === currentGroup.keyRelationship;

    if (useCurrentGroup) {
      currentGroup.extrinsics.push(extrinsic);
    } else {
      groups.push({
        extrinsics: [extrinsic],
        keyRelationship
      });
    }
  });

  return groups;
}

export async function authorizeBatch ({ batchFunction,
  did,
  extrinsics,
  nonce,
  sign,
  submitter }: {
  batchFunction: SubmittableExtrinsicFunction<'promise'>
  did: Uid
  extrinsics: Extrinsic[]
  nonce?: BN
  sign: SignExtrinsicCallback
  submitter: UidAddress
}): Promise<SubmittableExtrinsic> {
  if (extrinsics.length === 0) {
    throw new Error(
      'Cannot build a batch with no transactions'
    );
  }

  if (parse(did).type === 'light') {
    throw new Error(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    );
  }

  if (extrinsics.length === 1) {
    return authorizeTx(did, extrinsics[0], sign, submitter, {
      txCounter: nonce
    });
  }

  const groups = groupExtrinsicsByKeyRelationship(extrinsics);
  const firstNonce = nonce || (await getNextNonce(did));

  const promises = groups.map(async (group, batchIndex) => {
    const list = group.extrinsics;
    const call = list.length === 1 ? list[0] : batchFunction(list);
    const txCounter = increaseNonce(firstNonce, batchIndex);

    const { keyRelationship } = group;

    return generateDidAuthenticatedTx({
      did,
      keyRelationship,
      sign,
      call,
      txCounter,
      submitter
    });
  });
  const batches = await Promise.all(promises);

  return batches.length === 1 ? batches[0] : batchFunction(batches);
}
