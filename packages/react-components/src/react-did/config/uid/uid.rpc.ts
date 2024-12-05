// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Option, Vec } from '@polkadot/types';
import type { AccountId32, Hash } from '@polkadot/types/interfaces';
import type { Codec } from '@polkadot/types/types';
import type { BN } from '@polkadot/util';
import type { DidDidDetails, DidDidDetailsDidPublicKeyDetails, DidServiceEndpointsDidEndpoint, PalletDidLookupLinkableAccountLinkableAccountId, RawDidLinkedInfo, UIDSupportDeposit } from '../../interfaces/augment-api/lookup.js';
import type { Deposit } from '../../interfaces/deposit.js';
import type { UidAddress } from '../../interfaces/uid/address.js';
import type { DidEncryptionKey, DidKey, DidServiceEndpoint, DidVerificationKey, Service, Uid, UidDocument, UriFragment } from '../../interfaces/uid/uidDocument.js';
import type { Address, SubstrateAddress } from './uidLink/accountLink.chain.js';

import { encodeAddress, ethereumEncode } from '@polkadot/util-crypto';

import { ss58Format } from './ss58Format.js';
import { getFullDidUri } from './uid.util.js';

type RpcDocument = Pick<
UidDocument,
'authentication' | 'assertionMethod' | 'capabilityDelegation' | 'keyAgreement'
> & {
  lastTxCounter: BN;
};

export type Web3Name = string;
export interface DidInfo {
  document: UidDocument;
  web3Name?: Web3Name;
  accounts: Address[];
}

function fromChain (encoded: AccountId32): Uid {
  return getFullDidUri(encodeAddress(encoded, ss58Format));
}

function servicesFromChain (
  encoded: DidServiceEndpointsDidEndpoint[]
): DidServiceEndpoint[] {
  return encoded.map((encodedValue) => serviceFromChain(encodedValue));
}

function resourceIdToChain (id: UriFragment): string {
  return id.replace(/^#/, '');
}

function didPublicKeyDetailsFromChain (
  keyId: Hash,
  keyDetails: DidDidDetailsDidPublicKeyDetails
): DidKey {
  const key = keyDetails.key.isPublicEncryptionKey
    ? keyDetails.key.asPublicEncryptionKey
    : keyDetails.key.asPublicVerificationKey;

  return {
    id: `#${keyId}`,
    type: key.type.toLowerCase() as DidKey['type'],
    publicKey: key.value.toU8a()
  };
}

function depositFromChain (deposit: UIDSupportDeposit): Deposit {
  return {
    owner: encodeAddress(deposit.owner, ss58Format),
    amount: deposit.amount.toBn()
  };
}

function isLinkableAccountId (
  arg: Codec
): arg is PalletDidLookupLinkableAccountLinkableAccountId {
  return 'isAccountId32' in arg && 'isAccountId20' in arg;
}

function accountFromChain (
  account: Codec,
  networkPrefix = ss58Format
): UidAddress | SubstrateAddress {
  if (isLinkableAccountId(account)) {
    // linked account is substrate address (ethereum-enabled storage version)
    if (account.isAccountId32) {
      return encodeAddress(account.asAccountId32, networkPrefix);
    }

    // linked account is ethereum address (ethereum-enabled storage version)
    if (account.isAccountId20) {
      return ethereumEncode(account.asAccountId20);
    }
  }

  // linked account is substrate account (legacy storage version)
  return encodeAddress(account.toU8a(), networkPrefix);
}

function connectedAccountsFromChain (
  encoded: Vec<Codec>,
  networkPrefix = ss58Format
): (UidAddress | SubstrateAddress)[] {
  return encoded.map<string>((account) =>
    accountFromChain(account, networkPrefix)
  );
}

export function serviceFromChain (
  encoded:
  | Option<DidServiceEndpointsDidEndpoint>
  | DidServiceEndpointsDidEndpoint
): Service<UriFragment> {
  const { id, serviceTypes, urls } =
    'unwrap' in encoded ? encoded.unwrap() : encoded;

  return {
    id: `#${id.toUtf8()}`,
    type: serviceTypes.map((type) => type.toUtf8()),
    serviceEndpoint: urls.map((url) => url.toUtf8())
  };
}

export function documentFromChain (encoded: DidDidDetails): RpcDocument {
  const { attestationKey,
    authenticationKey,
    delegationKey,
    keyAgreementKeys,
    lastTxCounter,
    publicKeys } = encoded;

  const keys: Record<string, DidKey> = [...publicKeys.entries()]
    .map(([keyId, keyDetails]) =>
      didPublicKeyDetailsFromChain(keyId, keyDetails)
    )
    .reduce((res: Record<string, DidKey>, key) => {
      res[resourceIdToChain(key.id)] = key;

      return res;
    }, {});

  const authentication = keys[authenticationKey.toHex()] as DidVerificationKey;

  const didRecord: RpcDocument = {
    authentication: [authentication],
    lastTxCounter: lastTxCounter.toBn()
  };

  if (attestationKey.isSome) {
    const key = keys[attestationKey.unwrap().toHex()] as DidVerificationKey;

    didRecord.assertionMethod = [key];
  }

  if (delegationKey.isSome) {
    const key = keys[delegationKey.unwrap().toHex()] as DidVerificationKey;

    didRecord.capabilityDelegation = [key];
  }

  const keyAgreementKeyIds = [...keyAgreementKeys.values()].map((keyId) =>
    keyId.toHex()
  );

  if (keyAgreementKeyIds.length > 0) {
    didRecord.keyAgreement = keyAgreementKeyIds.map(
      (id) => keys[id] as DidEncryptionKey
    );
  }

  return didRecord;
}

export function linkedInfoFromChain (
  encoded: Option<RawDidLinkedInfo>,
  networkPrefix = ss58Format
): DidInfo {
  const { accounts, details, identifier, serviceEndpoints, w3n } =
    encoded.unwrap();

  const didRec = documentFromChain(details);
  const did: UidDocument = {
    uri: fromChain(identifier),
    authentication: didRec.authentication,
    assertionMethod: didRec.assertionMethod,
    capabilityDelegation: didRec.capabilityDelegation,
    keyAgreement: didRec.keyAgreement
  };

  const service = servicesFromChain(serviceEndpoints);

  if (service.length > 0) {
    did.service = service;
  }

  const web3Name = w3n.isNone ? undefined : w3n.unwrap().toHuman();
  const linkedAccounts = connectedAccountsFromChain(accounts, networkPrefix);

  return {
    document: did,
    web3Name,
    accounts: linkedAccounts
  };
}
