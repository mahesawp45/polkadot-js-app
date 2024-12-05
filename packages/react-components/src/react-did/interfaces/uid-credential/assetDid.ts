// [object Object]
// SPDX-License-Identifier: Apache-2.0

export type Caip2ChainNamespace = string

export type Caip2ChainReference = string

export type Caip2ChainId = `${Caip2ChainNamespace}:${Caip2ChainReference}`

export type Caip19AssetNamespace = string

export type Caip19AssetReference = string

export type Caip19AssetInstance = string

export type Caip19AssetId =
  | `${Caip19AssetNamespace}:${Caip19AssetReference}`
  | `${Caip19AssetNamespace}:${Caip19AssetReference}:${Caip19AssetInstance}`

export type AssetDidUri = `did:asset:${Caip2ChainId}.${Caip19AssetId}`
