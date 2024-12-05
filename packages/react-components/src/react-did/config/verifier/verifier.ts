// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Uid } from '../../interfaces/uid/uidDocument.js';
import type { ICredential } from '../../interfaces/uid-credential/credential.js';
import type { IAttestation } from '../../interfaces/verifier.js';

import * as uidUtils from '../uid/uid.util.js';
import * as Credential from '../uid-credential/credential.js';
import * as DataUtils from '../uid-credential/dataUtil.js';
import { hashToId, idToHash } from '../uid-credential/uidDocument.js';

export function verifyDataStructure (input: IAttestation): void {
  if (!input.uidDocumentHash) {
    throw new Error('uidDocumentHash is missing');
  }

  DataUtils.verifyIsHex(input.uidDocumentHash, 256);

  if (!input.vcHash) {
    throw new Error('vcHash is missing');
  }

  DataUtils.verifyIsHex(input.vcHash, 256);

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new Error('delegationId is missing');
  }

  if (!input.owner) {
    throw new Error('owner is missing');
  }

  uidUtils.validateUri(input.owner, 'Did');

  if (typeof input.revoked !== 'boolean') {
    throw new Error('revoked is missing');
  }
}

export function fromCredentialAndDid (
  credential: ICredential,
  verifierDid: Uid
): IAttestation {
  const attestation = {
    vcHash: Credential.idToHash(credential.uid_vc),
    uidDocumentHash: idToHash(credential.uid_document),
    delegationId: credential.vc_metadata.delegationId,
    owner: verifierDid,
    revoked: false
  };

  verifyDataStructure(attestation);

  return attestation;
}

export function verifyAgainstCredential (
  attestation: IAttestation,
  credential: ICredential
): void {
  const idDocument = hashToId(attestation.uidDocumentHash);
  const credentialMismatch =
    credential.uid_document !== idDocument;
  const uidDocumentMismatch = Credential.idToHash(credential.uid_vc) !== attestation.vcHash;
  const delegationMismatch =
    credential.vc_metadata.delegationId !== attestation.delegationId;

  if (credentialMismatch || uidDocumentMismatch || delegationMismatch) {
    throw new Error(
      `Some attributes of the on-chain attestation diverge from the credential: ${[
        'uidDocumentHash',
        'delegationId',
        'claimHash'
      ]
        .filter(
          (_, i) => [uidDocumentMismatch, delegationMismatch, credentialMismatch][i]
        )
        .join(', ')}`
    );
  }

  Credential.verifyDataIntegrity(credential);
}
