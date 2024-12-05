// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Null, Option } from '@polkadot/types';
import type { Codec } from '@polkadot/types/types';
import type { RawDidLinkedInfo } from '../../../interfaces/augment-api/lookup.js';
import type { DidKey, DidResourceUri, KeyRelationship, Uid } from '../../../interfaces/uid/uidDocument.js';
import type { DidResolutionResult, ResolvedDidKey } from '../../../interfaces/uid/uidResolver.js';

import * as ConfigService from '../../chain-helper/configService.js';
import { toChain } from '../uid.chain.js';
import { parse } from '../uid.config.js';
import { linkedInfoFromChain } from '../uid.rpc.js';
import { getFullDidUri } from '../uid.util.js';
import * as lightUidDetails from '../uidDetails/lightUidDetails.js';
import * as UidDetail from '../uidDetails/uidDetails.js';

export async function resolve (did: Uid): Promise<DidResolutionResult | null> {
  const { type } = parse(did);
  const api = ConfigService.get('api');
  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid;
  const { document, web3Name } = await queryFunction(toChain(did))
    .then((result: Codec) => {
      // Convert the Codec result to Option<RawDidLinkedInfo>
      const optionResult = result as unknown as Option<RawDidLinkedInfo>;

      return linkedInfoFromChain(optionResult);
    })
    .catch(() => ({ document: undefined, web3Name: undefined }));

  if (type === 'full' && document) {
    return {
      document,
      metadata: {
        deactivated: false
      },
      ...(web3Name && { web3Name })
    };
  }

  // If the full DID has been deleted (or the light DID was upgraded and deleted),
  // return the info in the resolution metadata.
  const isFullDidDeleted = await api.query.uid.didBlacklist(toChain(did));

  if (isFullDidDeleted) {
    return {
      // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
      metadata: {
        deactivated: true
      }
    };
  }

  if (type === 'full') {
    return null;
  }

  const lightDocument = lightUidDetails.parseDocumentFromLightDid(did, false);

  // If a full DID with same subject is present, return the resolution metadata accordingly.
  if (document) {
    return {
      metadata: {
        canonicalId: getFullDidUri(did),
        deactivated: false
      }
    };
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  // Metadata will simply contain `deactivated: false`.
  return {
    document: lightDocument,
    metadata: {
      deactivated: false
    }
  };
}

export function keyToResolvedKey (key: DidKey, did: Uid): ResolvedDidKey {
  const { id, includedAt, publicKey, type } = key;

  return {
    controller: did,
    id: `${did}${id}`,
    publicKey,
    type,
    ...(includedAt && { includedAt })
  };
}

export async function resolveKey (
  keyUri: DidResourceUri,
  expectedVerificationMethod?: KeyRelationship
): Promise<ResolvedDidKey> {
  const { did, fragment: keyId } = parse(keyUri);

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw new Error(`Key URI "${keyUri}" is not a valid DID resource`);
  }

  const resolved = await resolve(did);

  if (!resolved) {
    throw new Error('DID not found');
  }

  const { document,
    metadata: { canonicalId } } = resolved;

  // If the light DID has been upgraded we consider the old key URI invalid, the full DID URI should be used instead.
  if (canonicalId) {
    throw new Error('DID Resolver Upgraded Did Error');
  }

  if (!document) {
    throw new Error('Did Deactivated Error');
  }

  const key = UidDetail.getKey(document, keyId);

  if (!key) {
    throw new Error('Key not found in DID');
  }

  // Check whether the provided key ID is within the keys for a given verification relationship, if provided.
  if (
    expectedVerificationMethod &&
    !document[expectedVerificationMethod]?.some(({ id }) => keyId === id)
  ) {
    throw new Error(
      `No key "${keyUri}" for the verification method "${expectedVerificationMethod}"`
    );
  }

  return keyToResolvedKey(key, did);
}
