/* eslint-disable max-classes-per-file */

export class SDKError extends Error {
  constructor (message?: string, options?: ErrorOptions) {
    super(message, options);
    // this line is the only reason for using SDKError
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends SDKError {}

export class UidDocumentHashMissingError extends SDKError {}

export class UidDocumentError extends SDKError {}

export class UidDocumentIdMismatchError extends SDKError {
  constructor (fromSchema: string, provided: string) {
    super(
      `Provided $id "${provided}" does not match schema $id "${fromSchema}"`
    );
  }
}

export class UidDocumentUnknownPropertiesError extends SDKError {}

export class UnsupportedKeyError extends SDKError {
  constructor (keyType: string) {
    super(`The provided key type "${keyType}" is currently not supported`);
  }
}

export class EncryptionError extends SDKError {}

export class DidError extends SDKError {}

export class DidExporterError extends SDKError {}

export class DidBatchError extends SDKError {}

export class DidNotFoundError extends SDKError {}

export class DidResolveUpgradedDidError extends SDKError {}

export class DidDeactivatedError extends SDKError {}

export class ClaimHashMissingError extends SDKError {}

export class RevokedTypeError extends SDKError {}

export class OwnerMissingError extends SDKError {}

export class SubjectMissingError extends SDKError {}

export class LegitimationsMissingError extends SDKError {}

export class ClaimNonceMapMissingError extends SDKError {}

export class ClaimMissingError extends SDKError {}

export class AddressTypeError extends SDKError {}

export class HashTypeError extends SDKError {}

export class HashMalformedError extends SDKError {
  constructor (hash?: string, type?: string) {
    if (hash && type) {
      super(`Provided ${type} hash "${hash}" is invalid or malformed`);
    } else if (hash) {
      super(`Provided hash "${hash}" is invalid or malformed`);
    } else {
      super('Provided hash invalid or malformed');
    }
  }
}

export class DataStructureError extends SDKError {}

export class DelegationIdTypeError extends SDKError {}

export class DelegationIdMissingError extends SDKError {}

export class DelegateSignatureMissingError extends SDKError {}

export class InvalidRootNodeError extends SDKError {}

export class InvalidDelegationNodeError extends SDKError {}

export class ClaimContentsMalformedError extends SDKError {}

export class ObjectUnverifiableError extends SDKError {}

export class QuoteUnverifiableError extends SDKError {}

export class ClaimNonceMapMalformedError extends SDKError {
  constructor (statement?: string) {
    if (statement) {
      super(`Nonce map malformed or incomplete for statement "${statement}"`);
    } else {
      super('Nonce map malformed or incomplete');
    }
  }
}

export class UnknownMessageBodyTypeError extends SDKError {}

export class SignatureMalformedError extends SDKError {}

export class DidSubjectMismatchError extends SDKError {
  constructor (actual: string, expected: string) {
    super(
      `The DID "${actual}" doesn't match the DID Document's URI "${expected}"`
    );
  }
}

export class HierarchyQueryError extends SDKError {
  constructor (rootId: string) {
    super(`Could not find root node with id "${rootId}"`);
  }
}

export class InvalidDidFormatError extends SDKError {
  constructor (did: string, options?: ErrorOptions) {
    super(`Not a valid DID "${did}"`, options);
  }
}

export class AddressInvalidError extends SDKError {
  constructor (address?: string, type?: string) {
    if (address && type) {
      super(`Provided ${type} address "${address}" is invalid`);
    } else if (address) {
      super(`Provided address "${address}" is invalid`);
    } else {
      super('Provided address invalid');
    }
  }
}

export class LegitimationsUnverifiableError extends SDKError {}

export class SignatureUnverifiableError extends SDKError {}

export class CredentialUnverifiableError extends SDKError {}

export class ClaimUnverifiableError extends SDKError {}

export class IdentityMismatchError extends SDKError {
  constructor (context?: string, type?: string) {
    if (type && context) {
      super(`${type} is not owner of the ${context}`);
    } else if (context) {
      super(`Identity is not owner of the ${context}`);
    } else {
      super('Addresses expected to be equal mismatched');
    }
  }
}

export class SubscriptionsNotSupportedError extends SDKError {
  constructor (options?: ErrorOptions) {
    super(
      'This function is not available if the blockchain API does not support state or event subscriptions, use `WsProvider` to enable the complete feature set',
      options
    );
  }
}

export class RootHashUnverifiableError extends SDKError {}

export class DecodingMessageError extends SDKError {}

export class TimeoutError extends SDKError {}

export class InvalidProofForStatementError extends SDKError {
  constructor (statement: string) {
    super(`Proof could not be verified for statement:\n${statement}`);
  }
}

export class NoProofForStatementError extends SDKError {
  constructor (statement: string) {
    super(`No matching proof found for statement:\n${statement}`);
  }
}

export class CodecMismatchError extends SDKError {}

export class PublicCredentialError extends SDKError {}
