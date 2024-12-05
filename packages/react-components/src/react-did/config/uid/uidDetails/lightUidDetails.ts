// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DidServiceEndpoint, LightDidSupportedVerificationKeyType, NewDidEncryptionKey, NewLightDidVerificationKey, Uid, UidDocument } from '../../../interfaces/uid/uidDocument.js';

import * as cborImp from 'cbor-web';

import { base58Decode, base58Encode, decodeAddress } from '@polkadot/util-crypto';

import { encryptionKeyTypes } from '../../../interfaces/uid/uidDocument.js';
import { ss58Format } from '../ss58Format.js';
import { resourceIdToChain, validateService } from '../uid.chain.js';
import { parse } from '../uid.config.js';
import { getAddressByKey } from '../uid.util.js';

const authenticationKeyId = '#authentication';
const encryptionKeyId = '#encryption';

type LightDidEncoding = '00' | '01';
const verificationKeyTypeToLightDidEncoding: Record<
LightDidSupportedVerificationKeyType,
LightDidEncoding
> = {
  sr25519: '00',
  ed25519: '01'
};

export interface CreateDocumentInput {
  /**
   * The DID authentication key. This is mandatory and will be used as the first authentication key
   * of the full DID upon migration.
   */
  authentication: [NewLightDidVerificationKey];
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  keyAgreement?: [NewDidEncryptionKey];
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   */
  service?: DidServiceEndpoint[];
}

function validateCreateDocumentInput ({ authentication,
  keyAgreement,
  service: services }: CreateDocumentInput): void {
  // Check authentication key type
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[authentication[0].type];

  if (!authenticationKeyTypeEncoding) {
    throw new Error(
      `Authentication key type "${authentication[0].type}" is not supported`
    );
  }

  if (
    keyAgreement?.[0].type &&
    !encryptionKeyTypes.includes(keyAgreement[0].type)
  ) {
    throw new Error(
      `Encryption key type "${keyAgreement[0].type}" is not supported`
    );
  }

  // Checks that for all service IDs have regular strings as their ID and not a full DID.
  // Plus, we forbid a service ID to be `authentication` or `encryption` as that would create confusion
  // when upgrading to a full DID.
  services?.forEach((service) => {
    // A service ID cannot have a reserved ID that is used for key IDs.
    if (service.id === '#authentication' || service.id === '#encryption') {
      throw new Error(
        `Cannot specify a service ID with the name "${service.id}" as it is a reserved keyword`
      );
    }

    validateService(service);
  });
}

const KEY_AGREEMENT_MAP_KEY = 'e';
const SERVICES_MAP_KEY = 's';

interface SerializableStructure {
  [KEY_AGREEMENT_MAP_KEY]?: NewDidEncryptionKey;
  [SERVICES_MAP_KEY]?: (Partial<Omit<DidServiceEndpoint, 'id'>> & {
    id: string;
  } & { types?: string[]; urls?: string[] })[];
}

function serializeAdditionalLightDidDetails ({ keyAgreement,
  service }: Pick<CreateDocumentInput, 'keyAgreement' | 'service'>): string | undefined {
  const objectToSerialize: SerializableStructure = {};

  if (keyAgreement) {
    const key = keyAgreement[0];

    objectToSerialize[KEY_AGREEMENT_MAP_KEY] = key;
  }

  if (service && service.length > 0) {
    objectToSerialize[SERVICES_MAP_KEY] = service.map(({ id, ...rest }) => ({
      id: resourceIdToChain(id),
      ...rest
    }));
  }

  if (Object.keys(objectToSerialize).length === 0) {
    return undefined;
  }

  const serializationVersion = 0x0;
  const serialized = cborImp.encode(objectToSerialize);

  return base58Encode([serializationVersion, ...serialized], true);
}

export function createLightDidDocument ({ authentication,
  keyAgreement = undefined,
  service }: CreateDocumentInput): UidDocument {
  validateCreateDocumentInput({
    authentication,
    keyAgreement,
    service
  });
  const encodedDetails = serializeAdditionalLightDidDetails({
    keyAgreement,
    service
  });
  // Validity is checked in validateCreateDocumentInput
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[authentication[0].type];
  const address = getAddressByKey(authentication[0]);

  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : '';
  const uri =
    `did:uid:light:${authenticationKeyTypeEncoding}${address}${encodedDetailsString}` as Uid;

  const did: UidDocument = {
    uri,
    authentication: [
      {
        id: authenticationKeyId, // Authentication key always has the #authentication ID.
        type: authentication[0].type,
        publicKey: authentication[0].publicKey
      }
    ],
    service
  };

  if (keyAgreement !== undefined) {
    did.keyAgreement = [
      {
        id: encryptionKeyId, // Encryption key always has the #encryption ID.
        type: keyAgreement[0].type,
        publicKey: keyAgreement[0].publicKey
      }
    ];
  }

  return did;
}

const lightDidEncodingToVerificationKeyType: Record<
LightDidEncoding,
LightDidSupportedVerificationKeyType
> = {
  '00': 'sr25519',
  '01': 'ed25519'
};

function deserializeAdditionalLightDidDetails (
  rawInput: string,
  version = 1
): Pick<CreateDocumentInput, 'keyAgreement' | 'service'> {
  if (version !== 1) {
    throw new Error('Serialization version not supported');
  }

  const decoded = base58Decode(rawInput, true);
  const serializationVersion = decoded[0];
  const serialized = decoded.slice(1);

  if (serializationVersion !== 0x0) {
    throw new Error('Serialization algorithm not supported');
  }

  const deserialized: SerializableStructure = cborImp.decode(serialized);

  const keyAgreement = deserialized[KEY_AGREEMENT_MAP_KEY];

  return {
    keyAgreement: keyAgreement && [keyAgreement],
    service: deserialized[SERVICES_MAP_KEY]?.map(
      ({ id, serviceEndpoint, type, types, urls }) => ({
        id: `#${id}`,
        // types for retro-compatibility
        type: (type ?? types)!,
        // urls for retro-compatibility
        serviceEndpoint: (serviceEndpoint ?? urls)!
      })
    )
  };
}

export function parseDocumentFromLightDid (
  uri: Uid,
  failIfFragmentPresent = true
): UidDocument {
  const { address,
    authKeyTypeEncoding,
    encodedDetails,
    fragment,
    type,
    version } = parse(uri);

  if (type !== 'light') {
    throw new Error(
      `Cannot build a light DID from the provided URI "${uri}" because it does not refer to a light DID`
    );
  }

  if (fragment && failIfFragmentPresent) {
    throw new Error(
      `Cannot build a light DID from the provided URI "${uri}" because it has a fragment`
    );
  }

  const keyType =
    authKeyTypeEncoding &&
    lightDidEncodingToVerificationKeyType[
      authKeyTypeEncoding as LightDidEncoding
    ];

  if (keyType === undefined || !keyType) {
    throw new Error(
      `Authentication key encoding "${authKeyTypeEncoding}" does not match any supported key type`
    );
  }

  const publicKey = decodeAddress(address, false, ss58Format);
  const authentication: [NewLightDidVerificationKey] = [
    { publicKey, type: keyType }
  ];

  if (!encodedDetails) {
    return createLightDidDocument({ authentication });
  }

  const { keyAgreement, service } = deserializeAdditionalLightDidDetails(
    encodedDetails,
    version
  );

  return createLightDidDocument({
    authentication,
    keyAgreement,
    service
  });
}
