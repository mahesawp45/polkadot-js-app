import { base58Encode } from "@polkadot/util-crypto";


import { DidResourceUri, UidDocument } from "react-components/src/react-did/interfaces/uid/uidDocument.js";
import { ConformingDidDocument, encryptionKeyTypesMap, JsonLDDidDocument, verificationKeyTypesMap } from "react-components/src/react-did/interfaces/uid/UidDocumentExporter.js";
import { UID_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from "./uidContexts.js";

function exportToJsonDidDocument(did: UidDocument): ConformingDidDocument {
  const {
    uri: controller,
    authentication,
    assertionMethod = [],
    capabilityDelegation = [],
    keyAgreement = [],
    service = [],
  } = did;

  const verificationMethod: ConformingDidDocument["verificationMethod"] = [
    ...authentication,
    ...assertionMethod,
    ...capabilityDelegation,
  ]
    .map((key) => ({ ...key, type: verificationKeyTypesMap[key.type] }))
    .concat(
      keyAgreement.map((key) => ({
        ...key,
        type: encryptionKeyTypesMap[key.type],
      }))
    )
    .map(({ id, type, publicKey }) => ({
      id: `${controller}${id}` as DidResourceUri,
      controller,
      type,
      publicKeyBase58: base58Encode(publicKey),
    }))
    .filter(
      // remove duplicates
      ({ id }, index, array) =>
        index === array.findIndex((key) => key.id === id)
    );

  return {
    id: controller,
    verificationMethod,
    authentication: [authentication[0].id],
    ...(assertionMethod[0] && {
      assertionMethod: [assertionMethod[0].id],
    }),
    ...(capabilityDelegation[0] && {
      capabilityDelegation: [capabilityDelegation[0].id],
    }),
    ...(keyAgreement.length > 0 && {
      keyAgreement: [keyAgreement[0].id],
    }),
    ...(service.length > 0 && {
      service: service.map((endpoint) => ({
        ...endpoint,
        id: `${controller}${endpoint.id}`,
      })),
    }),
  };
}

function exportToJsonLdDidDocument(did: UidDocument): JsonLDDidDocument {
  const document = exportToJsonDidDocument(did) as ConformingDidDocument;
  document["@context"] = [W3C_DID_CONTEXT_URL, UID_DID_CONTEXT_URL];
  return document as JsonLDDidDocument;
}

export function exportToDidDocument(
  did: UidDocument,
  mimeType: "application/json" | "application/ld+json"
): ConformingDidDocument {
  switch (mimeType) {
    case "application/json":
      return exportToJsonDidDocument(did);
    case "application/ld+json":
      return exportToJsonLdDidDocument(did);
    default:
      throw new Error(
        `The MIME type "${mimeType}" not supported by any of the available exporters`
      );
  }
}
