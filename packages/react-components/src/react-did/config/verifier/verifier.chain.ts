// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Option } from '@polkadot/types';
import type { AttestationAttestationsAttestationDetails } from '../../interfaces/augment-api/lookup.js';
import type { Hash } from '../../interfaces/uid-credential/credential.js';
import type { IAttestation } from '../../interfaces/verifier.js';

import * as ConfigService from '../chain-helper/configService.js';
import * as DidChain from '../uid/uid.chain.js';

const log = ConfigService.LoggingFactory.getLogger('Attestation');

export function fromChain (
  encoded: Option<AttestationAttestationsAttestationDetails>,
  claimHash: Hash // all the other decoders do not use extra data; they just return partial types
): IAttestation {
  const chainAttestation = encoded.unwrap();
  const delegationId = chainAttestation.authorizationId
    .unwrapOr(undefined)
    ?.value.toHex();
  const attestation: IAttestation = {
    vcHash: claimHash,
    uidDocumentHash: chainAttestation.ctypeHash.toHex(),
    owner: DidChain.fromChain(chainAttestation.attester),
    delegationId: delegationId || null,
    revoked: chainAttestation.revoked.valueOf()
  };

  log.info(`Decoded attestation: ${JSON.stringify(attestation)}`);

  return attestation;
}
