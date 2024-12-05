// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { DidKey, DidResourceUri, KeyRelationship, Uid, UidDocument } from './uidDocument.js';
import type { ConformingDidKey } from './UidDocumentExporter.js';

export interface DidResolutionDocumentMetadata {
  /**
   * If present, it indicates that the resolved by DID should be treated as if it were the DID as specified in this property.
   */
  canonicalId?: Uid;
  /**
   * A boolean flag indicating whether the resolved DID has been deactivated.
   */
  deactivated: boolean;
}

export interface DidResolutionResult {
  /**
   * The resolved DID document. It is undefined if the DID has been upgraded or deleted.
   */
  document?: UidDocument;
  /**
   * The DID resolution metadata.
   */
  metadata: DidResolutionDocumentMetadata;
  /**
   * The DID's web3Name, if any.
   */
  web3Name?: string;
}

export type DidResolve = (did: Uid) => Promise<DidResolutionResult | null>;

export type ResolvedDidKey = Pick<ConformingDidKey, 'id' | 'controller'> &
Pick<DidKey, 'publicKey' | 'type' | 'includedAt'>;

export type DidResolveKey = (
  didUri: DidResourceUri,
  expectedVerificationMethod?: KeyRelationship
) => Promise<ResolvedDidKey>;
