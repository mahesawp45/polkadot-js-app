// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { ICredential } from '../../interfaces/uid-credential/credential.js';
import type { IUidDocument, UidDocumentHash } from '../../interfaces/uid-document/documentType.js';
import type { Schema } from '../../interfaces/uid-document/schemaTypes.js';

import { get, LoggingFactory } from '../chain-helper/configService.js';
import { encodeObjectAsStr, hashStr } from './utils/document-util.js';
import * as jsonabc from './utils/jsonabc.js';
import { Validator } from './utils/validator.js';
import { VCModel, VCModelDraft01, VCModelV1 } from './document-schema.js';

let notifyDeprecated: (uidDocumentId: IUidDocument['$id']) => void = () => {
  // do nothing
};

if (
  process?.env?.NODE_ENV &&
  process.env.NODE_ENV !== 'production'
) {
  const logger = LoggingFactory.getLogger('deprecated');
  const alreadyNotified = new Set<IUidDocument['$id']>();

  notifyDeprecated = (uidDocumentId) => {
    if (alreadyNotified.has(uidDocumentId)) {
      return;
    }

    logger.warn(
      `Your application has processed the UidDocument '${uidDocumentId}' which follows the meta schema '${VCModelDraft01.$id}'. This class of schemas has known issues that can result in unexpected properties being present in a credential. Consider switching to a UidDocument based on meta schema ${VCModelV1.$id} which fixes this issue.`
    );
    alreadyNotified.add(uidDocumentId);
  };
}

export function serializeForHash (
  uidDocument: IUidDocument | Omit<IUidDocument, '$id'>
): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $id, ...schemaWithoutId } = uidDocument as IUidDocument;

  return encodeObjectAsStr(schemaWithoutId);
}

export function getHashForSchema (
  uidDocument: IUidDocument | Omit<IUidDocument, '$id'>
): UidDocumentHash {
  const serializedSchema = serializeForHash(uidDocument);

  return hashStr(serializedSchema);
}

export function hashToId (hash: UidDocumentHash): IUidDocument['$id'] {
  return `uid:document:${hash}`;
}

export function getIdForSchema (
  schema: IUidDocument | Omit<IUidDocument, '$id'>
): IUidDocument['$id'] {
  return hashToId(getHashForSchema(schema));
}

export function verifyObjectAgainstSchema (
  object: Record<string, any>,
  schema: Schema,
  messages?: string[],
  referencedSchemas?: Schema[]
): void {
  const validator = new Validator(schema, '7', false);

  if (referencedSchemas) {
    referencedSchemas.forEach((i) => validator.addSchema(i));
  }

  const { errors, valid } = validator.validate(object);

  if (valid === true) {
    return;
  }

  if (messages) {
    errors.forEach((error) => {
      messages.push(error.error);
    });
  }

  throw new Error(
    `JSON schema verification failed for object ${JSON.stringify(errors)}`
  );
}

export function verifyDataStructure (input: IUidDocument): void {
  verifyObjectAgainstSchema(input, VCModel);

  if (input.$schema === VCModelDraft01.$id) {
    notifyDeprecated(input.$id);
  }

  const idFromSchema = getIdForSchema(input);

  if (idFromSchema !== input.$id) {
    throw new Error(
      `Provided $id "${input.$id}" does not match schema $id "${idFromSchema}"`
    );
  }
}

export function verifyClaimAgainstSchema (
  claimContents: ICredential['proof'],
  schema: IUidDocument,
  messages?: string[]
): void {
  verifyObjectAgainstSchema(schema, VCModel, messages);

  if (schema.$schema === VCModelDraft01.$id) {
    notifyDeprecated(schema.$id);
  }

  verifyObjectAgainstSchema(claimContents, schema, messages);
}

const uidDocumentVersionToSchemaId = {
  'draft-01': VCModelDraft01.$id,
  V1: VCModelV1.$id
};

export function fromProperties (
  title: IUidDocument['title'],
  properties: IUidDocument['properties'],
  version: 'draft-01' | 'V1' = 'V1'
): IUidDocument {
  const schema: Omit<IUidDocument, '$id'> = {
    properties,
    title,
    $schema: uidDocumentVersionToSchemaId[version],
    type: 'object'
  };
  const uidDocument = jsonabc.sortObj({
    ...schema,
    $id: getIdForSchema(schema)
  });

  verifyDataStructure(uidDocument);

  return uidDocument;
}

export function idToHash (id: IUidDocument['$id']): UidDocumentHash {
  const result = id.match(/uid:document:(0x[0-9a-f]+)/i);

  if (!result) {
    throw new Error(`The string ${id} is not a valid UidDocument id`);
  }

  return result[1] as UidDocumentHash;
}

export async function verifyStored (uidDocument: IUidDocument): Promise<void> {
  const api = get('api');
  const hash = idToHash(uidDocument.$id);
  const encoded = await api.query.credential.credentials(hash);

  if (encoded.isEmpty) {
    throw new Error(`UidDocument with hash ${hash} is not registered on chain`);
  }
}
