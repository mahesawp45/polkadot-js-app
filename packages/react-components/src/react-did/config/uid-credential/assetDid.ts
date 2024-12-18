// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { AssetDidUri, Caip2ChainId, Caip2ChainNamespace, Caip2ChainReference, Caip19AssetId, Caip19AssetInstance, Caip19AssetNamespace, Caip19AssetReference } from '../../interfaces/uid-credential/assetDid.js';

const ASSET_DID_REGEX =
  /^did:asset:(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\.(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(:(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/;

interface IAssetDidParsingResult {
  uri: AssetDidUri;
  chainId: Caip2ChainId;
  chainNamespace: Caip2ChainNamespace;
  chainReference: Caip2ChainReference;
  assetId: Caip19AssetId;
  assetNamespace: Caip19AssetNamespace;
  assetReference: Caip19AssetReference;
  assetInstance?: Caip19AssetInstance;
}

/**
   * Parses an AssetDID uri and returns the information contained within in a structured form.

   * @param assetDidUri An AssetDID uri as a string.
  * @returns Object containing information extracted from the AssetDID uri.
   */
export function parse (assetDidUri: AssetDidUri): IAssetDidParsingResult {
  const matches = ASSET_DID_REGEX.exec(assetDidUri)?.groups;

  if (!matches) {
    throw new Error(`Asset DID string expected, got ${assetDidUri}`);
  }

  const { assetId, chainId } = matches as Omit<IAssetDidParsingResult, 'uri'>;

  return {
    ...(matches as Omit<IAssetDidParsingResult, 'uri'>),
    uri: `did:asset:${chainId}.${assetId}`
  };
}

/**
 * Checks that a string (or other input) is a valid AssetDID uri.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 */
export function validateUri (input: unknown): void {
  if (typeof input !== 'string') {
    throw new TypeError(`Asset DID string expected, got ${typeof input}`);
  }

  parse(input as AssetDidUri);
}
