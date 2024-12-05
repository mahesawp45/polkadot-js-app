// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { SignResponseData } from '../../interfaces/chain-helper/cryptoCallbacks.js';
import type { DidResourceUri, DidSignature, Uid, VerificationKeyRelationship } from '../../interfaces/uid/uidDocument.js';
import type { DidResolveKey } from '../../interfaces/uid/uidResolver.js';

import { u8aToHex } from '@polkadot/util';

import { resolveKey } from './uidResolver/uidResolver.js';
import * as Crypto from './crypto.js';
import { parse } from './uid.config.js';

export function signatureToJson ({ keyUri,
  signature }: SignResponseData): DidSignature {
  return { signature: u8aToHex(signature), keyUri };
}

export interface DidSignatureVerificationInput {
  message: string | Uint8Array;
  signature: Uint8Array;
  keyUri: DidResourceUri;
  expectedSigner?: Uid;
  allowUpgraded?: boolean;
  expectedVerificationMethod?: VerificationKeyRelationship;
  didResolveKey?: DidResolveKey;
}

export async function verifyDidSignature ({ allowUpgraded = false,
  didResolveKey = resolveKey,
  expectedSigner,
  expectedVerificationMethod,
  keyUri,
  message,
  signature }: DidSignatureVerificationInput): Promise<void> {
  // checks if key uri points to the right did; alternatively we could check the key's controller
  const signer = parse(keyUri);

  if (expectedSigner && expectedSigner !== signer.did) {
    // check for allowable exceptions
    const expected = parse(expectedSigner);
    // NECESSARY CONDITION: subjects and versions match
    const subjectVersionMatch =
      expected.address === signer.address &&
      expected.version === signer.version;
    // EITHER: signer is a full did and we allow signatures by corresponding full did
    const allowedUpgrade = allowUpgraded && signer.type === 'full';
    // OR: both are light dids and their auth key type matches
    const keyTypeMatch =
      signer.type === 'light' &&
      expected.type === 'light' &&
      expected.authKeyTypeEncoding === signer.authKeyTypeEncoding;

    if (!(subjectVersionMatch && (allowedUpgrade || keyTypeMatch))) {
      throw new Error(`Expected ${expected.did} but got ${signer.did}`);
    }
  }

  const { publicKey } = await didResolveKey(keyUri, expectedVerificationMethod);

  Crypto.verify(message, signature, publicKey);
}

type OldDidSignature = Pick<DidSignature, 'signature'> & {
  keyId: DidSignature['keyUri'];
};

export function signatureFromJson (
  input: DidSignature | OldDidSignature
): Pick<SignResponseData, 'keyUri' | 'signature'> {
  const keyUri = 'keyUri' in input ? input.keyUri : input.keyId;
  const signature = Crypto.coToUInt8(input.signature);

  return { signature, keyUri };
}
