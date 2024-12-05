// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DidKey, UidDocument } from '../../../interfaces/uid/uidDocument.js';

const signingMethodTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const;

export const signingMethodTypes = signingMethodTypesC as unknown as string[];
export type DidSigningMethodType = (typeof signingMethodTypesC)[number];

export function isValidVerificationMethodType (
  input: string
): input is DidSigningMethodType {
  return signingMethodTypes.includes(input);
}

export function getKeys (
  did: Partial<UidDocument> & Pick<UidDocument, 'authentication'>
): DidKey[] {
  return [
    ...did.authentication,
    ...(did.assertionMethod || []),
    ...(did.capabilityDelegation || []),
    ...(did.keyAgreement || [])
  ];
}

export function getKey (
  did: Partial<UidDocument> & Pick<UidDocument, 'authentication'>,
  id: DidKey['id']
): DidKey | undefined {
  return getKeys(did).find((key) => key.id === id);
}
