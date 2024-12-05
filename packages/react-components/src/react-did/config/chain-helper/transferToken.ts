// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { ApiPromise } from '@polkadot/api';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { AccountInfo } from '../../interfaces/augment-api/lookup.js';

import dotenv from 'dotenv';

import { BN } from '@polkadot/util';
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { makeKeypairFromUri } from '../uid/crypto.js';

dotenv.config();

async function getAccount (mnemonic: string) {
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Mnemonic is not provided or invalid');
  }

  await cryptoWaitReady();
  const account = makeKeypairFromUri(mnemonic);

  return account;
}

async function getPreFoundedAccount () {
  const mnemonic = process.env.MNEMONIC_PRE_FOUNDED!;
  const account = await getAccount(mnemonic);

  return account;
}

async function getBalance (api: ApiPromise, accountAddress: string) {
  const accointInfo = (await api.query.system.account(
    accountAddress
  )) as unknown as AccountInfo;
  const currentBalance = new BN(accointInfo.data.free.toString());

  return currentBalance;
}

async function getNonce (api: ApiPromise, accountAddress: string) {
  const nonce = await api.rpc.system.accountNextIndex(accountAddress);

  return nonce;
}

export async function transferToken (
  api: ApiPromise,
  toAddress: string,
  amount: BN
): Promise<void> {
  try {
    const preFoundedAccount = await getPreFoundedAccount();

    const decodedAddress = decodeAddress(toAddress);

    encodeAddress(decodedAddress, api.registry.chainSS58);

    const pallets = api.runtimeMetadata.asLatest.pallets.map((p: any) =>
      p.name.toString()
    );

    if (!pallets.includes('Balances')) {
      throw new Error('Pallet Balances is not available.');
    }

    const transfer = api.tx.balances.transferKeepAlive(toAddress, amount);
    const balanceSufficient = await isBalanceSufficientForTransaction(
      api,
      preFoundedAccount,
      transfer
    );

    if (!balanceSufficient) {
      throw new Error('Balance is not sufficient.');
    }

    const initialRecipientBalance = await getBalance(api, toAddress);

    const existentialDeposit = new BN(
      api.consts.balances.existentialDeposit.toString()
    );

    if (initialRecipientBalance.isZero() && amount.lt(existentialDeposit)) {
      amount = existentialDeposit.add(new BN('1'));
    }

    const nonce = await getNonce(api, preFoundedAccount.address);

    const tip = new BN('100000000000');

    await new Promise<void>((resolve, reject) => {
      transfer.signAndSend(
        preFoundedAccount,
        { nonce, tip },
        async ({ events, status }) => {
          if (status.isFinalized) {
            events.forEach(({ event }) => {
              if (event.method === 'ExtrinsicFailed') {
                reject(new Error(`Transaction failed: ${event.toHuman()}`));
              }
            });
            const success = await validateRecipientBalance(
              api,
              toAddress,
              initialRecipientBalance,
              amount
            );

            if (success) {
              resolve();
            } else {
              reject(new Error('Recipient balance validation failed'));
            }
          }
        }
      );
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('Inability to pay some fees')
    ) {
      console.error('Transaksi gagal karena saldo tidak cukup.');
    } else if (error instanceof Error) {
      console.error('Error while sending transaction:', error);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

export async function validateRecipientBalance (
  api: ApiPromise,
  toAddress: string,
  initialBalance: BN,
  expectedIncrease: BN,
  timeoutMs = 10000,
  intervalMs = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const currentBalance = await getBalance(api, toAddress);

    if (currentBalance.sub(initialBalance).gte(expectedIncrease)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.error(
    `Balance validation failed for recipient (${toAddress}). Expected increase: ${expectedIncrease.toString()}`
  );

  return false;
}

export async function isBalanceSufficientForTransaction (
  api: ApiPromise,
  fromKeyring: KeyringPair,
  transaction: SubmittableExtrinsic<'promise'>
): Promise<boolean> {
  const freeBalance = await getBalance(api, fromKeyring.address);

  const feeInfo = await transaction.paymentInfo(fromKeyring);
  const estimatedFee = feeInfo.partialFee;

  const existentialDeposit = new BN(
    api.consts.balances.existentialDeposit.toString()
  );

  const remainingBalance = freeBalance.sub(estimatedFee);

  if (remainingBalance.lt(existentialDeposit)) {
    return false;
  }

  return true;
}

export async function refillPreFoundedBalance (api: ApiPromise) {
  try {
    const mnemonicTest = process.env.MNEMONIC_SUDO!;
    const sudoAccount = await getAccount(mnemonicTest);

    const preFoundedAccount = await getPreFoundedAccount();
    const preFoundedBalance = await getBalance(api, preFoundedAccount.address);

    const targetAddress = api.createType('MultiAddress', {
      Id: preFoundedAccount.address
    });
    const newBalance = new BN('100000000000000000000000000000000000000');
    const call = api.tx.balances.forceSetBalance(targetAddress, newBalance);
    const sudoCall = api.tx.sudo.sudo(call);

    const nonce = await getNonce(api, sudoAccount.address);

    await new Promise<void>((resolve, reject) => {
      sudoCall.signAndSend(
        sudoAccount,
        { nonce },
        async ({ events, status }) => {
          if (status.isFinalized) {
            events.forEach(({ event }) => {
              if (event.method === 'ExtrinsicFailed') {
                reject(new Error(`Transaction failed: ${event.toHuman()}`));
              }
            });
            const success = await validateRecipientBalance(
              api,
              preFoundedAccount.address,
              preFoundedBalance,
              newBalance
            );

            if (success) {
              resolve();
            } else {
              reject(new Error('Recipient balance validation failed'));
            }
          }
        }
      );
    });
  } catch (error) {
    console.error('Error while refilling pre-founded balance:', error);
  }
}
