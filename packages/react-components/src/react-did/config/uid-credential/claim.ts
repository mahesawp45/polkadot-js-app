// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { HexString } from '@polkadot/util/types';
import type { Uid } from '../../interfaces/uid/uidDocument.js';
import type { ICredential, IVcStatus, PartialClaim } from '../../interfaces/uid-credential/credential.js';
import type { IUidDocument } from '../../interfaces/uid-document/documentType.js';

import { hexToBn } from '@polkadot/util';

import * as Crypto from '../uid/crypto.js';
import { validateUri } from '../uid/uid.util.js';
import { verifyIsHex } from './dataUtil.js';
import * as UidDocument from './uidDocument.js';

export function fromUidDocumentAndClaimContents (
  verifierDid: Uid,
  uidDocument: IUidDocument,
  claimContents: ICredential['proof'],
  claimOwner: Uid
): PartialClaim {
  UidDocument.verifyDataStructure(uidDocument);
  UidDocument.verifyClaimAgainstSchema(claimContents, uidDocument);
  const claim = {
    uid_document: uidDocument.$id,
    uid_controller: verifierDid,
    doc_type: uidDocument.title,
    uid_subject: claimOwner,
    proof: claimContents,
    vc_status: 'active' as IVcStatus
  };

  verifyDataStructure(uidDocument.$id, claimOwner, claim);

  return claim;
}

export function verifyDataStructure (
  uidDocument: IUidDocument['$id'],
  claimOwner: Uid,
  input: ICredential['proof'] | PartialClaim
): void {
  if (!uidDocument) {
    throw new Error('UidDocumentHash is missing');
  }

  if (claimOwner) {
    validateUri(claimOwner, 'Did');
  }

  if (input.proof !== undefined) {
    Object.entries(input.proof).forEach(([key, value]) => {
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

  verifyIsHex(UidDocument.idToHash(uidDocument), 256);
}

function jsonLDcontents (
  claim: PartialClaim,
  expanded = true
): Record<string, unknown> {
  const { proof, uid_document, uid_subject } = claim;

  if (!uid_document) {
    throw new Error('uid_document is missing');
  }

  const vocabulary = `${uid_document}#`;
  const result: Record<string, unknown> = {};

  if (uid_subject) {
    result['@id'] = uid_subject;
  }

  if (!expanded) {
    return {
      ...result,
      '@context': { '@vocab': vocabulary },
      ...proof
    };
  }

  Object.entries(proof || {}).forEach(([key, value]) => {
    result[vocabulary + key] = value;
  });

  return result;
}

function makeStatementsJsonLD (claim: PartialClaim): string[] {
  const normalized = jsonLDcontents(claim, true);

  return Object.entries(normalized).map(([key, value]) =>
    JSON.stringify({ [key]: value })
  );
}

export function hashClaimContents (
  claim: PartialClaim,
  options: Crypto.HashingOptions & {
    canonicalisation?: (claim: PartialClaim) => string[];
  } = {}
): {
    hashes: HexString[];
    nonceMap: Record<string, string>;
  } {
  // apply defaults
  const defaults = { canonicalisation: makeStatementsJsonLD };
  const canonicalisation =
    options.canonicalisation || defaults.canonicalisation;
  // use canonicalisation algorithm to make hashable statement strings
  const statements = canonicalisation(claim);
  // iterate over statements to produce salted hashes
  const processed = Crypto.hashStatements(statements, options);
  // produce array of salted hashes to add to credential
  const hashes = processed
    .map(({ saltedHash }) => saltedHash)
    .sort((a, b) => hexToBn(a).cmp(hexToBn(b)));

  // explicitly define the type for nonceMap
  const nonceMap: Record<string, string> = {};

  processed.forEach(({ digest, nonce, statement }) => {
    // throw if we can't map a digest to a nonce - this should not happen if the nonce map is complete and the credential has not been tampered with
    if (!nonce) {
      throw new Error(`Statement ${statement} could not be mapped to a nonce`);
    }

    nonceMap[digest] = nonce;
  });

  return { hashes, nonceMap };
}

export function verifyDisclosedAttributes (
  claim: PartialClaim,
  proof: {
    nonces: Record<string, string>;
    hashes: string[];
  },
  options: Pick<Crypto.HashingOptions, 'hasher'> & {
    canonicalisation?: (claim: PartialClaim) => string[];
  } = {}
): void {
  // apply defaults
  const defaults = { canonicalisation: makeStatementsJsonLD };
  const canonicalisation =
    options.canonicalisation || defaults.canonicalisation;
  const { nonces } = proof;
  // use canonicalisation algorithm to make hashable statement strings
  const statements = canonicalisation(claim);
  // iterate over statements to produce salted hashes
  const hashed = Crypto.hashStatements(statements, { ...options, nonces });
  // check resulting hashes
  const digestsInProof = Object.keys(nonces);
  const { errors, verified } = hashed.reduce<{
    verified: boolean;
    errors: Error[];
  }>(
    (status, { digest, nonce, saltedHash, statement }) => {
      // check if the statement digest was contained in the proof and mapped it to a nonce
      if (!digestsInProof.includes(digest) || !nonce) {
        status.errors.push(
          new Error(`Statement ${statement} could not be mapped to a nonce`)
        );

        return { ...status, verified: false };
      }

      // check if the hash is whitelisted in the proof
      if (!proof.hashes.includes(saltedHash)) {
        status.errors.push(new Error(`Statement ${statement} invalid proof`));

        return { ...status, verified: false };
      }

      return status;
    },
    { verified: true, errors: [] }
  );

  if (verified !== true) {
    throw new Error(
      `One or more statements in the claim could not be verified: ${errors}`
    );
  }
}
