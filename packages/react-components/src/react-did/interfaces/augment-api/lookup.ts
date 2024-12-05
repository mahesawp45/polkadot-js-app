// [object Object]
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/types/lookup';

import type { AccountId32, Call, H256 } from '@polkadot/types/interfaces';
import type { bool, BTreeMap, BTreeSet, Bytes, Enum, Option, Struct, Text, U8aFixed, u32, u64, u128, Vec } from '@polkadot/types-codec';

export type DidApiAccountId = PalletDidLookupLinkableAccountLinkableAccountId

export interface DidDidDetailsDidPublicKeyDetails extends Struct {
  readonly key: DidDidDetailsDidPublicKey;
  readonly blockNumber: u64;
}

export type SpCoreEd25519Public = U8aFixed
export type SpCoreSr25519Public = U8aFixed
export type SpCoreEcdsaPublic = U8aFixed
export interface DidDidDetailsDidVerificationKey extends Enum {
  readonly isEd25519: boolean;
  readonly asEd25519: SpCoreEd25519Public;
  readonly isSr25519: boolean;
  readonly asSr25519: SpCoreSr25519Public;
  readonly isEcdsa: boolean;
  readonly asEcdsa: SpCoreEcdsaPublic;
  readonly isAccount: boolean;
  readonly asAccount: AccountId32;
  readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa' | 'Account';
}
export interface DidDidDetailsDidEncryptionKey extends Enum {
  readonly isX25519: boolean;
  readonly asX25519: U8aFixed;
  readonly type: 'X25519';
}
export interface DidDidDetailsDidPublicKey extends Enum {
  readonly isPublicVerificationKey: boolean;
  readonly asPublicVerificationKey: DidDidDetailsDidVerificationKey;
  readonly isPublicEncryptionKey: boolean;
  readonly asPublicEncryptionKey: DidDidDetailsDidEncryptionKey;
  readonly type: 'PublicVerificationKey' | 'PublicEncryptionKey';
}
export interface UIDSupportDeposit extends Struct {
  readonly owner: AccountId32;
  readonly amount: u128;
}
export interface DidDidDetails extends Struct {
  readonly authenticationKey: H256;
  readonly keyAgreementKeys: BTreeSet<H256>;
  readonly delegationKey: Option<H256>;
  readonly attestationKey: Option<H256>;
  readonly publicKeys: BTreeMap<H256, DidDidDetailsDidPublicKeyDetails>;
  readonly lastTxCounter: u64;
  readonly deposit: UIDSupportDeposit;
}

export interface DidServiceEndpointsDidEndpoint extends Struct {
  readonly id: Bytes;
  readonly serviceTypes: Vec<Bytes>;
  readonly urls: Vec<Bytes>;
}

export interface RawDidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<DidApiAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<DidServiceEndpointsDidEndpoint>;
  readonly details: DidDidDetails;
}
export type PalletDidLookupAccountAccountId20 = U8aFixed
export interface PalletDidLookupLinkableAccountLinkableAccountId extends Enum {
  readonly isAccountId20: boolean;
  readonly asAccountId20: PalletDidLookupAccountAccountId20;
  readonly isAccountId32: boolean;
  readonly asAccountId32: AccountId32;
  readonly type: 'AccountId20' | 'AccountId32';
}

export interface DidDidDetailsDidAuthorizedCallOperation extends Struct {
  readonly did: AccountId32;
  readonly txCounter: u64;
  readonly call: Call;
  readonly blockNumber: u64;
  readonly submitter: AccountId32;
}

export interface CredentialCredentialEntry extends Struct {
  readonly creator: AccountId32;
  readonly createdAt: u64;
}

interface RuntimeCommonAuthorizationAuthorizationId extends Enum {
  readonly isDelegation: boolean;
  readonly asDelegation: H256;
  readonly type: 'Delegation';
}

export interface AttestationAttestationsAttestationDetails extends Struct {
  readonly ctypeHash: H256;
  readonly attester: AccountId32;
  readonly authorizationId: Option<RuntimeCommonAuthorizationAuthorizationId>;
  readonly revoked: bool;
}

export interface AccountData extends Struct {
  readonly free: u128;
  readonly reserved: u128;
  readonly miscFrozen: u128;
  readonly feeFrozen: u128;
}

export interface AccountInfo extends Struct {
  readonly nonce: u32;
  readonly consumers: u32;
  readonly providers: u32;
  readonly sufficients: u32;
  readonly data: AccountData;
}

export default {
  UidSupportDeposit: {
    owner: 'AccountId32',
    amount: 'u128'
  },
  AttestationAttestationsAttestationDetails: {
    ctypeHash: 'H256',
    attester: 'AccountId32',
    authorizationId: 'Option<RuntimeCommonAuthorizationAuthorizationId>',
    revoked: 'bool'
  }
};
