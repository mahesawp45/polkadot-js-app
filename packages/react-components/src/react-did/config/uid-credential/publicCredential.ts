// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';
import type { IDelegationNode } from '../../interfaces/delegation.js';
import type { AssetDidUri } from '../../interfaces/uid-credential/assetDid.js';
import type { IAssetClaim, IPublicCredentialInput, PartialAssetClaim } from '../../interfaces/uid-credential/publicCredential.js';
import type { UidDocumentHash } from '../../interfaces/uid-document/documentType.js';

import * as cborImp from 'cbor-web';

import * as AssetDid from './assetDid.js';
import * as DataUtils from './dataUtil.js';

export interface EncodedPublicCredential {
  uidDocumentHash: UidDocumentHash;
  subject: AssetDidUri;
  claims: HexString;
  authorization: IDelegationNode['id'] | null;
}

export function toChain (
  publicCredential: IPublicCredentialInput
): EncodedPublicCredential {
  const { claims, delegationId, subject, uidDocumentHash } = publicCredential;

  const cborSerializedClaims = cborImp.encode(claims);

  return {
    uidDocumentHash,
    subject,
    claims: `0x${cborSerializedClaims.toString('hex')}`,
    authorization: delegationId
  };
}

export interface PublicCredentialCreationOptions {
  delegationId?: IDelegationNode['id'] | null;
}

function verifyClaimStructure (input: IAssetClaim | PartialAssetClaim): void {
  if (!input.uidDocumentHash) {
    throw new Error('UidDocumentHash is missing');
  }

  if (input.subject) {
    AssetDid.validateUri(input.subject);
  }

  if (input.contents) {
    Object.entries(input.contents).forEach(([key, value]) => {
      if (
        !key ||
        typeof key !== 'string' ||
        !['string', 'number', 'boolean', 'object'].includes(typeof value)
      ) {
        throw new Error(
          'Claim contents must be an object with string keys and values'
        );
      }
    });
  }

  DataUtils.verifyIsHex(input.uidDocumentHash, 256);
}

function verifyDataStructure (input: IPublicCredentialInput): void {
  if (typeof input.claims !== 'object' || input.claims === null) {
    throw new Error('claims is missing');
  }

  if (typeof input.subject !== 'string') {
    throw new Error('subject is missing');
  }

  verifyClaimStructure({
    uidDocumentHash: input.uidDocumentHash,
    contents: input.claims,
    subject: input.subject
  });

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new Error('delegationId is missing');
  }
}

export function fromClaim (
  claim: IAssetClaim,
  { delegationId = null }: PublicCredentialCreationOptions = {}
): IPublicCredentialInput {
  const credential: IPublicCredentialInput = {
    claims: claim.contents,
    uidDocumentHash: claim.uidDocumentHash,
    subject: claim.subject,
    delegationId
  };

  verifyDataStructure(credential);

  return credential;
}
