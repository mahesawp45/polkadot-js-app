// Copyright 2017-2024 @polkadot/react-components authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';

import AddressInfo from '../AddressInfo.js';
import { styled } from '../styled.js';
import { useTranslation } from '../translate.js';
import Keyring from '@polkadot/keyring';
import { UidAddress } from '../react-did/interfaces/uid/address.js';
import { Uid } from '../react-did/interfaces/uid/uidDocument.js';
import { resolve } from '../react-did/config/uid/uidResolver/uidResolver.js';
import { DidResolutionResult } from '../react-did/interfaces/uid/uidResolver.js';
import { connect } from '../react-did/config/chain-helper/connection.js';
import settings from '@polkadot/ui-settings';


interface Props {
  address: string;
  className?: string;
}

const WITH_BALANCE = { available: true, bonded: true, free: true, locked: true, reserved: true, total: true };

function DIDComponent ({ address, className }: Props): React.ReactElement<Props> | null {
    const [did,setDid] =  useState<string>()

const getDidAssets = async (address: string) => {
    console.log("address from sidebar did",address)
  try {

        await connect(settings.apiUrl);

    const keyrings = new Keyring({ type: 'ed25519', ss58Format: 38 });
    const keypair = keyrings.addFromAddress(address);
    const uidAddress: UidAddress = keypair.address as UidAddress;
    const didUri: Uid = `did:uid:${uidAddress}`; // Adjust this logic to match your DID generation logic
    const result = await resolve(didUri);
    setDid(result?.document?.uri as string)

    // // Optional logging (you can uncomment if needed)
    // // console.log('address uid', uidAddress);
    // // console.log('user did', result);
  } catch (error) {
    console.error('error did ui', error);
    throw new Error('Failed to resolve DID'); // Handle the error and rethrow if necessary
  }
};

useEffect(()=>{
    getDidAssets(address)
},[address])

  return (
    <StyledSection className={className}>
        {did && <>
        
      <div className='ui--AddressMenu-sectionHeader'>
        Identity
      </div>
      <p className='ui--idendity-value'>{did}</p>
        </>
        }

      {/* <AddressInfo
        address={address}
        className='balanceExpander'
        key={address}
        withBalance={WITH_BALANCE}
        withLabel
      /> */}
    </StyledSection>
  );
}

const StyledSection = styled.section`

  .balanceExpander {
    justify-content: flex-start;

    .column {
      width: auto;
      max-width: 18.57rem;

      label {
        text-align: left;
        color: inherit;
      }

      .ui--Expander-content .ui--FormatBalance-value {
        font-size: var(--font-size-small);
      }
    }
  }
   .ui--idendity-value{
    text-align: left;
    font-size: 14px;
    word-break: break-all;

  }
`;

export default React.memo(DIDComponent);
