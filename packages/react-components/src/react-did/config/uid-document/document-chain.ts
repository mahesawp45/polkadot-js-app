// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Bytes, Option } from '@polkadot/types';
import type { AccountId } from '@polkadot/types/interfaces';
import type { BN } from '@polkadot/util';
import type { CredentialCredentialEntry } from '../../interfaces/augment-api/lookup.js';
import type { Uid } from '../../interfaces/uid/uidDocument.js';
import type { IUidDocument } from '../../interfaces/uid-document/documentType.js';

import * as ConfigService from '../chain-helper/configService.js';
import { flattenCalls, retrieveExtrinsicFromBlock } from '../chain-helper/util.js';
import * as Did from '../uid/uid.chain.js';
import { serializeForHash } from '../uid-credential/uidDocument.js';
import { getHashForSchema, hashToId, idToHash, verifyDataStructure } from './document-schemaType.js';

export function toChain (uidDocument: IUidDocument): string {
  return serializeForHash(uidDocument);
}

export interface UidDocumentChainDetails {
  /**
   * The DID of the UidDocuent's creator.
   */
  creator: Uid;
  /**
   * The block number in which the UidDocuent was created.
   */
  createdAt: BN;
}

export type IUidDocumentDetails = {
  uidDocument: IUidDocument;
} & UidDocumentChainDetails;

export function fromChain(
  encoded: Option<AccountId> | AccountId
): Pick<UidDocumentChainDetails, 'creator'>;

export function fromChain(
  encoded: Option<CredentialCredentialEntry> | CredentialCredentialEntry
): UidDocumentChainDetails;

// eslint-disable-next-line jsdoc/require-jsdoc
export function fromChain (
  encoded:
  | Option<CredentialCredentialEntry>
  | Option<AccountId>
  | CredentialCredentialEntry
  | AccountId
): UidDocumentChainDetails | Pick<UidDocumentChainDetails, 'creator'> {
  const unwrapped = 'unwrap' in encoded ? encoded.unwrap() : encoded;

  if ('creator' in unwrapped && 'createdAt' in unwrapped) {
    const { createdAt, creator } = unwrapped;

    return {
      creator: Did.fromChain(creator),
      createdAt: createdAt.toBn()
    };
  }

  return {
    creator: Did.fromChain(unwrapped)
  };
}

function uidDocumentInputFromChain (input: Bytes): IUidDocument {
  try {
    // Throws on invalid JSON input. UidDocument is expected to be a valid JSON document.
    const reconstructedObject = JSON.parse(input.toUtf8());
    // Re-compute the ID to validate the resulting IUidDocument.
    const reconstructedUidDocumentId = hashToId(
      getHashForSchema(reconstructedObject)
    );
    const reconstructedUidDocument: IUidDocument = {
      ...reconstructedObject,
      $id: reconstructedUidDocumentId
    };

    // If throws if the input was a valid JSON but not a valid UidDocument.
    verifyDataStructure(reconstructedUidDocument);

    return reconstructedUidDocument;
  } catch (cause) {
    throw new Error(
      `The provided payload cannot be parsed as a UidDocument: ${input.toHuman()}: ${cause}`
    );
  }
}

export async function fetchFromChain (
  credentialId: IUidDocument['$id']
): Promise<IUidDocumentDetails> {
  const api = ConfigService.get('api');
  const uidDocumentHash = idToHash(credentialId);

  const uidDocumentEntry = await api.query.credential.ctypes<
  Option<CredentialCredentialEntry>
  >(uidDocumentHash);
  const { createdAt, creator } = fromChain(uidDocumentEntry);

  if (typeof createdAt === 'undefined') {
    throw new Error(
      'Cannot fetch uidDocument definitions on a chain that does not store the createdAt block'
    );
  }

  const extrinsic = await retrieveExtrinsicFromBlock(
    api,
    createdAt,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.credential.CTypeCreated.is(event) &&
          event.data[1].toString() === uidDocumentHash
      )
  );

  if (extrinsic === null) {
    throw new Error(
      `There is no UidDocument with the provided ID "${credentialId}" on chain.`
    );
  }

  // Unpack any nested calls, e.g., within a batch or `submit_did_call`
  const extrinsicCalls = flattenCalls(extrinsic.method, api);

  extrinsicCalls.forEach((callHex, index) => {
    const decodedCall = api.createType('Call', callHex.toHex ? callHex.toHex() : callHex);
  });

  const uidDocumentCreationCalls = extrinsicCalls.filter((c) => {
    const decodedCall = api.createType('Call', c.toHex ? c.toHex() : c);

    return decodedCall.method === 'add' && decodedCall.section === 'credential';
  });

  // Re-create the uidDocument for each call identified to find the right uidDocument.
  // If more than one matching call is present, it always considers the last one as the valid one.
  const uidDocumentDefinition = uidDocumentCreationCalls.reduceRight<
  IUidDocument | undefined
  >((selectedUidDocument, uidDocumentCreationCall) => {
    if (selectedUidDocument) {
      return selectedUidDocument;
    }

    const uidDocument = uidDocumentInputFromChain(
      uidDocumentCreationCall.args[0] as Bytes
    );

    if (uidDocument.$id === credentialId) {
      return uidDocument;
    }

    return undefined;
  }, undefined);

  if (typeof uidDocumentDefinition === 'undefined') {
    throw new Error(
      'Block should always contain the full uidDocument, eventually.'
    );
  }

  return {
    uidDocument: uidDocumentDefinition,
    creator,
    createdAt
  };
}
