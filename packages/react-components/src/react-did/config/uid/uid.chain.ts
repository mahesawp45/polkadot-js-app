// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import type { u32 } from '@polkadot/types';
import type { AccountId32, Extrinsic } from '@polkadot/types/interfaces';
import type { AnyNumber } from '@polkadot/types/types';
import type { DidDidDetailsDidAuthorizedCallOperation } from '../../interfaces/augment-api/lookup.js';
import type { SignExtrinsicCallback, SignRequestData, SignResponseData } from '../../interfaces/chain-helper/cryptoCallbacks.js';
import type { UidAddress } from '../../interfaces/uid/address.js';
import type { DidServiceEndpoint, Uid, UidDocument, UriFragment, VerificationKeyRelationship } from '../../interfaces/uid/uidDocument.js';

import { encodeAddress } from '@polkadot/keyring';

import { get } from '../chain-helper/configService.js';
import { ss58Format } from './ss58Format.js';
import { parse } from './uid.config.js';
import { getAddressByKey, getFullDidUri } from './uid.util.js';

export type ChainDidIdentifier = UidAddress;
const signingMethodTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const;

export const signingMethodTypes = signingMethodTypesC as unknown as string[];
export type DidSigningMethodType = (typeof signingMethodTypesC)[number];

const encryptionMethodTypesC = ['x25519'] as const;

export const encryptionMethodTypes =
  encryptionMethodTypesC as unknown as string[];
export type DidEncryptionMethodType = (typeof encryptionMethodTypesC)[number];

export interface BaseNewDidKey {
  publicKey: Uint8Array;
  type: string;
}

export type NewDidVerificationKey = BaseNewDidKey & {
  type: DidSigningMethodType;
};

export type NewDidEncryptionKey = BaseNewDidKey & {
  type: DidEncryptionMethodType;
};
export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array };
export interface EncodedEncryptionKey { x25519: Uint8Array }
export type EncodedDidKey = EncodedVerificationKey | EncodedEncryptionKey;

export function toChain (did: Uid): UidAddress {
  return parse(did).address;
}

export function publicKeyToChain(
  key: NewDidVerificationKey
): EncodedVerificationKey;
export function publicKeyToChain(
  key: NewDidEncryptionKey
): EncodedEncryptionKey;

export function publicKeyToChain (
  key: NewDidVerificationKey | NewDidEncryptionKey
): EncodedDidKey {
  // TypeScript can't infer type here, so we have to add a type assertion.
  return { [key.type]: key.publicKey } as EncodedDidKey;
}

export type EncodedSignature = EncodedVerificationKey;

export interface AuthorizeCallInput {
  did: Uid;
  txCounter: AnyNumber;
  call: Extrinsic;
  submitter: UidAddress;
  blockNumber?: AnyNumber;
}

export interface SigningOptions {
  sign: SignExtrinsicCallback;
  keyRelationship: VerificationKeyRelationship;
}

export async function generateDidAuthenticatedTx ({ blockNumber,
  call,
  did,
  keyRelationship,
  sign,
  submitter,
  txCounter }: AuthorizeCallInput & SigningOptions): Promise<SubmittableExtrinsic> {
  const api = get('api');
  const signableCall =
    api.registry.createType<DidDidDetailsDidAuthorizedCallOperation>(
      api.tx.uid.submitDidCall.meta.args[0].type.toString(),
      {
        txCounter,
        did: toChain(did),
        call,
        submitter,
        blockNumber: blockNumber ?? (await api.query.system.number())
      }
    );
  const signature = await sign({
    data: signableCall.toU8a(),
    keyRelationship,
    did
  });
  const encodedSignature = {
    [signature.keyType]: signature.signature
  } as EncodedSignature;

  return api.tx.uid.submitDidCall(signableCall, encodedSignature);
}

const UriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/;

function isUriFragment (str: string): boolean {
  try {
    return UriFragmentRegex.test(str) && !!decodeURIComponent(str);
  } catch {
    return false;
  }
}

export function resourceIdToChain (id: UriFragment): string {
  return id.replace(/^#/, '');
}

function isUri (str: string): boolean {
  try {
    const url = new URL(str); // this actually accepts any URI but throws if it can't be parsed

    return url.href === str || encodeURI(decodeURI(str)) === str; // make sure our URI has not been converted implicitly by URL
  } catch {
    return false;
  }
}

export function validateService (endpoint: DidServiceEndpoint): void {
  const { id, serviceEndpoint } = endpoint;

  if (id.startsWith('did:uid')) {
    throw new Error(
      `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id "${id}"`
    );
  }

  if (!isUriFragment(resourceIdToChain(id))) {
    throw new Error(
      `The service ID must be valid as a URI fragment according to RFC#3986, which "${id}" is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding the desired id.`
    );
  }

  serviceEndpoint.forEach((uri) => {
    if (!isUri(uri)) {
      throw new Error(
        `A service URI must be a URI according to RFC#3986, which "${uri}" (service id "${id}") is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding resource locators beforehand.`
      );
    }
  });
}

export type GetStoreTxSignCallback = (
  signData: Omit<SignRequestData, 'did'>
) => Promise<Omit<SignResponseData, 'keyUri'>>;

interface GetStoreTxInput {
  authentication: [NewDidVerificationKey];
  assertionMethod?: [NewDidVerificationKey];
  capabilityDelegation?: [NewDidVerificationKey];
  keyAgreement?: NewDidEncryptionKey[];

  service?: DidServiceEndpoint[];
}

interface ChainEndpoint {
  id: string;
  serviceTypes: DidServiceEndpoint['type'];
  urls: DidServiceEndpoint['serviceEndpoint'];
}

export function serviceToChain (service: DidServiceEndpoint): ChainEndpoint {
  validateService(service);
  const { id, serviceEndpoint, type } = service;

  return {
    id: resourceIdToChain(id),
    serviceTypes: type,
    urls: serviceEndpoint
  };
}

export async function getStoreTx (
  input: GetStoreTxInput | UidDocument,
  submitter: UidAddress,
  sign: GetStoreTxSignCallback
): Promise<SubmittableExtrinsic> {
  const api = get('api');

  const { assertionMethod,
    authentication,
    capabilityDelegation,
    keyAgreement = [],
    service = [] } = input;

  if (!('authentication' in input) || typeof authentication[0] !== 'object') {
    throw new Error(
      'The provided DID does not have an authentication key to sign the creation operation'
    );
  }

  // For now, it only takes the first verifier key, if present.
  if (assertionMethod && assertionMethod.length > 1) {
    throw new Error(
      `More than one verifier key (${assertionMethod.length}) specified. The chain can only store one.`
    );
  }

  // For now, it only takes the first delegation key, if present.
  if (capabilityDelegation && capabilityDelegation.length > 1) {
    throw new Error(
      `More than one delegation key (${capabilityDelegation.length}) specified. The chain can only store one.`
    );
  }

  const maxKeyAgreementKeys = (
    api.consts.uid.maxNewKeyAgreementKeys as u32
  ).toNumber();

  if (keyAgreement.length > maxKeyAgreementKeys) {
    throw new Error(
      `The number of key agreement keys in the creation operation is greater than the maximum allowed, which is ${maxKeyAgreementKeys}`
    );
  }

  const maxNumberOfServicesPerDid = (
    api.consts.uid.maxNumberOfServicesPerDid as u32
  ).toNumber();

  if (service.length > maxNumberOfServicesPerDid) {
    throw new Error(
      `Cannot store more than ${maxNumberOfServicesPerDid} service endpoints per DID`
    );
  }

  const [authenticationKey] = authentication;
  const did = getAddressByKey(authenticationKey);

  const newVerifierKey =
    assertionMethod &&
    assertionMethod.length > 0 &&
    publicKeyToChain(assertionMethod[0]);

  const newDelegationKey =
    capabilityDelegation &&
    capabilityDelegation.length > 0 &&
    publicKeyToChain(capabilityDelegation[0]);

  const newKeyAgreementKeys = keyAgreement.map(publicKeyToChain);
  const newServiceDetails = service.map(serviceToChain);

  const apiInput = {
    did,
    submitter,
    newVerifierKey,
    newDelegationKey,
    newKeyAgreementKeys,
    newServiceDetails
  };

  const encoded = api.registry
    .createType(api.tx.uid.create.meta.args[0].type.toString(), apiInput)
    .toU8a();

  const signature = await sign({
    data: encoded,
    keyRelationship: 'authentication'
  });
  const encodedSignature = {
    [signature.keyType]: signature.signature
  } as EncodedSignature;

  return api.tx.uid.create(encoded, encodedSignature);
}

export function fromChain (encoded: AccountId32): Uid {
  return getFullDidUri(encodeAddress(encoded, ss58Format));
}
