// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { AccountId32, Hash } from '@polkadot/types/interfaces';
import type { BN } from '@polkadot/util';
import type { HexString } from '@polkadot/util/types';
import type { DidDidDetailsDidPublicKeyDetails } from '../../interfaces/augment-api/lookup.js';
import type { UidAddress, UidKeyringPair } from '../../interfaces/uid/address.js';
import type { Uid, UidDocument, UidUrl, UriFragment } from '../../interfaces/uid/uidDocument.js';
import type { DidEncryptionMethodType, DidSigningMethodType } from './uid.util.js';

import { encodeAddress, ethereumEncode } from '@polkadot/util-crypto';

import { ss58Format } from './ss58Format.js';
import { isUidAddress } from './uid.util.js';

const FULL_DID_LATEST_VERSION = 1;
const LIGHT_DID_LATEST_VERSION = 1;

const FULL_UID_DID_REGEX =
  /^did:uid:(?<address>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/;

const LIGHT_UID_DID_REGEX =
  /^did:uid:light:(?<authKeyType>[0-9]{2})(?<address>4[1-9a-km-zA-HJ-NP-Z]{47,48})(:(?<encodedDetails>.+?))?(?<fragment>#[^#\n]+)?$/;

interface IDidParsingResult {
  did: Uid;
  version: number;
  type: 'light' | 'full';
  address: UidAddress;
  queryParameters?: Record<string, string>;
  fragment?: UriFragment;
  authKeyTypeEncoding?: string;
  encodedDetails?: string;
}

function exportQueryParamsFromUidUrl (
  did: UidUrl
): Record<string, string> | undefined {
  try {
    const urlified = new URL(did);

    return urlified.searchParams.size > 0
      ? Object.fromEntries(urlified.searchParams)
      : undefined;
  } catch {
    throw new Error('Malformed URL');
  }
}

export function parse (did: Uid | UidUrl): IDidParsingResult {
  // Then we check if it conforms to either a full or a light DID.
  let matches = FULL_UID_DID_REGEX.exec(did)?.groups;

  if (matches) {
    const { fragment, version: versionString } = matches;
    const address = matches.address as UidAddress;
    const version = versionString
      ? parseInt(versionString, 10)
      : FULL_DID_LATEST_VERSION;
    const queryParameters = exportQueryParamsFromUidUrl(did as UidUrl);

    return {
      did: did.replace(fragment || '', '') as Uid,
      version,
      type: 'full',
      address,
      queryParameters,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment)
    };
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_UID_DID_REGEX.exec(did)?.groups;

  if (matches) {
    const { authKeyType,
      encodedDetails,
      fragment,
      version: versionString } = matches;
    const address = matches.address as UidAddress;
    const version = versionString
      ? parseInt(versionString, 10)
      : LIGHT_DID_LATEST_VERSION;
    const queryParameters = exportQueryParamsFromUidUrl(did as UidUrl);

    return {
      did: did.replace(fragment || '', '') as Uid,
      version,
      type: 'light',
      address,
      queryParameters,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType
    };
  }

  throw new Error('Invalid DID format');
}

export function getFullDid (
  didOrAddress: Uid | UidAddress,
  version = FULL_DID_LATEST_VERSION
): Uid {
  const address = isUidAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress).address;
  const versionString = version === 1 ? '' : `v${version}`;

  return `did:uid:${versionString}${address}` as Uid;
}

export function fromChain (encoded: AccountId32): Uid {
  const address = encodeAddress(encoded, ss58Format);

  if (!address.startsWith('4')) {
    throw new Error('Address does not start with 4');
  }

  const uidAddress = address;

  return getFullDid(uidAddress);
}

export interface ChainDidBaseKey {
  id: UriFragment;
  publicKey: Uint8Array;
  includedAt?: BN;
  type: string;
}

export type ChainDidVerificationKey = ChainDidBaseKey & {
  type: DidSigningMethodType;
};

export type ChainDidEncryptionKey = ChainDidBaseKey & {
  type: DidEncryptionMethodType;
};

export type ChainDidKey = ChainDidVerificationKey | ChainDidEncryptionKey;

export function publicKeyFromChain (
  keyId: Hash,
  keyDetails: DidDidDetailsDidPublicKeyDetails
): ChainDidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey;

  return {
    id: `#${keyId.toHex()}`,
    publicKey: key.value.toU8a(),
    type: key.type.toLowerCase() as ChainDidKey['type']
  };
}

export type SubstrateAddress = UidKeyringPair['address'];

export type EthereumAddress = HexString;

export type Address = UidAddress | EthereumAddress;

export interface LinkedDidInfo {
  document: UidDocument;
  accounts: Address[];
}
