// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Option } from '@polkadot/types';
import type { AttestationAttestationsAttestationDetails } from '../../interfaces/augment-api/lookup.js';
import type { SignCallback } from '../../interfaces/cryptoCallbacks.js';
import type { IDelegationNode } from '../../interfaces/delegation.js';
import type { Uid } from '../../interfaces/uid/uidDocument.js';
import type { DidResolveKey } from '../../interfaces/uid/uidResolver.js';
import type { Hash, ICredential, ICredentialPresentation, IVcStatus, PartialClaim } from '../../interfaces/uid-credential/credential.js';
import type { IUidDocument } from '../../interfaces/uid-document/documentType.js';

import { u8aConcat, u8aToHex } from '@polkadot/util';

import { get } from '../chain-helper/configService.js';
import { coToUInt8, hash } from '../uid/crypto.js';
import * as Crypto from '../uid/crypto.js';
import { signatureFromJson, signatureToJson, verifyDidSignature } from '../uid/uid.signature.js';
import { resolveKey } from '../uid/uidResolver/uidResolver.js';
import * as Verifier from '../verifier/verifier.chain.js';
import { verifyAgainstCredential } from '../verifier/verifier.js';
import * as Claim from './claim.js';
import { verifyIsHex } from './dataUtil.js';
import { verifyClaimAgainstSchema } from './uidDocument.js';

function getHashRoot (leaves: Uint8Array[]): Uint8Array {
  const result = u8aConcat(...leaves);

  return hash(result);
}

export function idToHash (id: ICredential['uid_vc']): Hash {
  const result = id.match(/uid:vc:(0x[0-9a-f]+)/i);

  if (!result) {
    throw new Error(`The string ${id} is not a valid vc id`);
  }

  return result[1] as Hash;
}

export function hashToId (hash: Hash): ICredential['uid_vc'] {
  return `uid:vc:${hash}`;
}

function getHashLeaves (
  claimHashes: Hash[],
  legitimations?: ICredential[],
  delegationId?: IDelegationNode['id'] | null
): Uint8Array[] {
  const result = claimHashes.map((item) => coToUInt8(item));

  if (legitimations) {
    legitimations.forEach((legitimation) => {
      const vcHash = idToHash(legitimation.uid_vc);

      result.push(coToUInt8(vcHash));
    });
  }

  if (delegationId) {
    result.push(coToUInt8(delegationId));
  }

  return result;
}

export function calculateUidVC (credential: Partial<ICredential>): Hash {
  const hashes = getHashLeaves(
    credential.vc_metadata?.proofHashes || [],
    credential.vc_metadata?.legitimations || [],
    credential.vc_metadata?.delegationId || null
  );
  const root = getHashRoot(hashes);

  return u8aToHex(root);
}

export function verifyDataStructure (input: ICredential): void {
  if (!('proof' in input)) {
    throw new Error('proof not provided');
  } else {
    Claim.verifyDataStructure(input.uid_document, input.uid_subject, input);
  }

  if (!input.uid_subject) {
    throw new Error('owner not provided');
  }

  if (!Array.isArray(input.vc_metadata.legitimations)) {
    throw new Error('legitimations not provided');
  }

  if (!('vc_metadata' in input)) {
    throw new Error('proofNonceMap not provided');
  }

  if (!('proofNonceMap' in input.vc_metadata)) {
    throw new Error('proofNonceMap not provided');
  }

  if (typeof input.vc_metadata.proofNonceMap !== 'object') {
    throw new Error('proofNonceMap is not an object');
  }

  Object.entries(input.vc_metadata.proofNonceMap).forEach(([digest, nonce]) => {
    verifyIsHex(digest, 256);

    if (!digest || typeof nonce !== 'string' || !nonce) {
      throw new Error(
        'proofNonceMap must be an object with string keys and string values'
      );
    }
  });

  if (!('proofHashes' in input.vc_metadata)) {
    throw new Error('proof hashes not provided');
  }

  if (
    typeof input.vc_metadata.delegationId !== 'string' &&
    input.vc_metadata.delegationId !== null
  ) {
    throw new Error('delegationId must be a string or null');
  }
}

export interface Options {
  legitimations?: ICredential[];
  delegationId?: IDelegationNode['id'] | null;
}

export function fromClaim (
  proof: PartialClaim,
  { delegationId = null, legitimations = [] }: Options = {}
): ICredential {
  const { hashes: proofHashes, nonceMap: proofNonceMap } =
    Claim.hashClaimContents(proof);

  const uidVc = calculateUidVC({
    vc_metadata: {
      legitimations,
      proofHashes,
      delegationId,
      proofNonceMap
    }
  });

  const credential: ICredential = {
    uid_vc: hashToId(uidVc),
    uid_document: proof.uid_document,
    uid_controller: proof.uid_controller!,
    doc_type: proof.doc_type!,
    uid_subject: proof.uid_subject!,
    proof: proof.proof!,
    vc_status: 'active' as IVcStatus,
    vc_metadata: {
      proofNonceMap,
      proofHashes,
      legitimations,
      delegationId
    }
  };

  verifyDataStructure(credential);

  return credential;
}

function getAttributes (credential: ICredential): Set<string> {
  return new Set(Object.keys(credential.proof));
}

export function removeClaimProperties (
  credential: ICredential,
  properties: string[]
): ICredential {
  const presentation: ICredential = JSON.parse(JSON.stringify(credential));

  // Hapus properti dari proof
  properties.forEach((key) => {
    delete presentation.proof[key];
  });

  const partialClaim: PartialClaim = {
    uid_document: credential.uid_document,
    uid_controller: credential.uid_controller,
    doc_type: credential.doc_type,
    uid_subject: credential.uid_subject,
    proof: credential.proof,
    vc_status: credential.vc_status
  };

  const { hashes: proofHashes, nonceMap: proofNonceMap } =
    Claim.hashClaimContents(partialClaim, {
      nonces: credential.vc_metadata.proofNonceMap
    });

  presentation.vc_metadata.proofNonceMap = proofNonceMap;
  presentation.vc_metadata.proofHashes = proofHashes;

  return presentation;
}

export function makeSigningData (
  input: ICredential,
  challenge?: string
): Uint8Array {
  return new Uint8Array([
    ...Crypto.coToUInt8(input.uid_vc),
    ...Crypto.coToUInt8(challenge)
  ]);
}

export async function createPresentation ({ challenge,
  credential,
  selectedAttributes,
  signCallback }: {
  credential: ICredential;
  signCallback: SignCallback;
  selectedAttributes?: string[];
  challenge?: string;
}): Promise<ICredentialPresentation> {
  // filter attributes that are not in public attributes
  const excludedClaimProperties = selectedAttributes
    ? Array.from(getAttributes(credential)).filter(
      (property) => !selectedAttributes.includes(property)
    )
    : [];

  // remove these attributes
  const presentation = removeClaimProperties(
    credential,
    excludedClaimProperties
  );

  const signature = await signCallback({
    data: makeSigningData(presentation, challenge),
    did: credential.uid_subject,
    keyRelationship: 'authentication'
  });

  return {
    ...presentation,
    claimerSignature: {
      ...signatureToJson(signature),
      ...(challenge && { challenge })
    }
  };
}

interface VerifyOptions {
  uidDocument?: IUidDocument;
  challenge?: string;
  didResolveKey?: DidResolveKey;
}

export interface VerifiedCredential extends ICredential {
  revoked: boolean;
  verifier: Uid;
}

export async function verifySignature (
  input: ICredentialPresentation,
  { challenge,
    didResolveKey = resolveKey }: {
    challenge?: string;
    didResolveKey?: DidResolveKey;
  } = {}
): Promise<void> {
  const { claimerSignature } = input;

  if (challenge && challenge !== claimerSignature.challenge) {
    throw new Error('Challenge differs from expected');
  }

  const signingData = makeSigningData(input, claimerSignature.challenge);

  await verifyDidSignature({
    ...signatureFromJson(claimerSignature),
    message: signingData,
    // check if credential owner matches signer
    expectedSigner: input.uid_subject,
    // allow full did to sign presentation if owned by corresponding light did
    allowUpgraded: true,
    expectedVerificationMethod: 'authentication',
    didResolveKey
  });
}

export function verifyRootHash (input: ICredential): void {
  if (idToHash(input.uid_vc) !== calculateUidVC(input)) {
    throw new Error('Root hash unverifiable');
  }
}

export function verifyDataIntegrity (input: ICredential): void {
  verifyRootHash(input);

  Claim.verifyDisclosedAttributes(input, {
    nonces: input.vc_metadata.proofNonceMap,
    hashes: input.vc_metadata.proofHashes
  });

  input.vc_metadata.legitimations.forEach(verifyDataIntegrity);
}

export function verifyWellFormed (
  credential: ICredential,
  { uidDocument }: VerifyOptions = {}
): void {
  verifyDataStructure(credential);
  verifyDataIntegrity(credential);

  if (uidDocument) {
    if (`uid:document:${credential.uid_document}` !== uidDocument.$id) {
      throw new Error(`Uid document mismatch: ${uidDocument.$id}`);
    }

    if (credential.doc_type !== uidDocument.title) {
      throw new Error(`Document type mismatch: ${uidDocument.title}`);
    }

    verifyClaimAgainstSchema(credential.proof, uidDocument);
  }
}

export async function verifyAttested (credential: ICredential): Promise<{
  verifier: Uid;
  revoked: boolean;
}> {
  const api = get('api');
  const vcHash = idToHash(credential.uid_vc);
  const maybeAttestation = (await api.query.verification.verifications(
    vcHash
  )) as Option<AttestationAttestationsAttestationDetails>;

  if (maybeAttestation.isNone) {
    throw new Error('Attestation not found');
  }

  const attestation = Verifier.fromChain(maybeAttestation, vcHash);

  verifyAgainstCredential(attestation, credential);
  const { owner: verifier, revoked } = attestation;

  return { verifier, revoked };
}

export async function verifyCredential (
  credential: ICredential,
  { uidDocument }: VerifyOptions = {}
): Promise<VerifiedCredential> {
  verifyWellFormed(credential, { uidDocument });
  const { revoked, verifier } = await verifyAttested(credential);

  return {
    ...credential,
    revoked,
    verifier
  };
}

export async function verifyPresentation (
  presentation: ICredentialPresentation,
  { challenge, didResolveKey = resolveKey, uidDocument }: VerifyOptions = {}
): Promise<VerifiedCredential> {
  await verifySignature(presentation, {
    challenge,
    didResolveKey
  });

  return verifyCredential(presentation, { uidDocument });
}
