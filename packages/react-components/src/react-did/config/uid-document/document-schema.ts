// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { Schema } from '../../interfaces/uid-document/schemaTypes.js';

export const VCModelV1: Schema & { $id: string } = {
  // $id is not contained in schema when fetched from ipfs bc that is impossible with a content-addressed system
  $id: 'https://dummyjson.com/c/e5e3-ed54-49e2-93e4',
  $schema: 'https://dummyjson.com/c/c703-da97-48ca-9a70',
  title: 'VC Metaschema (V1)',
  description:
    'Describes a VC, which is a JSON schema for validating UID claim types.',
  type: 'object',
  properties: {
    $id: { pattern: '^uid:document:0x[0-9a-f]+$', type: 'string' },
    $schema: {
      type: 'string'
      // can't use a const referencing schema id for a content-addressed schema
    },
    title: { type: 'string' },
    type: { const: 'object', type: 'string' },
    properties: {
      patternProperties: {
        '^.+$': {
          oneOf: [
            { $ref: '#/definitions/string' },
            { $ref: '#/definitions/number' },
            { $ref: '#/definitions/boolean' },
            { $ref: '#/definitions/vcReference' },
            { $ref: '#/definitions/array' }
          ],
          type: 'object'
        }
      },
      type: 'object'
    }
  },
  required: [
    '$id',
    '$schema',
    'properties',
    'title',
    'type'
  ],
  definitions: {
    vcReference: {
      properties: {
        $ref: {
          pattern: '^uid:document:0x[0-9a-f]+(#/properties/.+)?$',
          format: 'uri',
          type: 'string'
        }
      },
      required: ['$ref']
    },
    string: {
      properties: {
        type: {
          const: 'string'
        },
        format: { enum: ['date', 'time', 'uri'] },
        enum: {
          type: 'array',
          items: { type: 'string' }
        },
        minLength: {
          type: 'number'
        },
        maxLength: {
          type: 'number'
        }
      },
      required: ['type']
    },
    boolean: {
      properties: {
        type: {
          const: 'boolean'
        }
      },
      required: ['type']
    },
    number: {
      properties: {
        type: {
          enum: ['integer', 'number']
        },
        enum: {
          type: 'array',
          items: { type: 'number' }
        },
        minimum: {
          type: 'number'
        },
        maximum: {
          type: 'number'
        }
      },
      required: ['type']
    },
    array: {
      properties: {
        type: { const: 'array' },
        items: {
          oneOf: [
            { $ref: '#/definitions/string' },
            { $ref: '#/definitions/number' },
            { $ref: '#/definitions/boolean' },
            { $ref: '#/definitions/vcReference' }
          ]
        },
        minItems: {
          type: 'number'
        },
        maxItems: {
          type: 'number'
        }
      },
      required: ['type', 'items']
    }
  }
};

export const VCModelDraft01: Schema & { $id: string } = {
  $id: 'https://dummyjson.com/c/6ad6-4d21-4b79-affa',
  $schema: 'https://dummyjson.com/c/c703-da97-48ca-9a70',
  title: 'VC Metaschema (draft-01)',
  description: `Describes a VC, which is a JSON schema for validating UID claim types. This version has known issues, the use of schema ${VCModelV1.$id} is recommended instead.`,
  type: 'object',
  properties: {
    $id: {
      type: 'string',
      format: 'uri',
      pattern: '^uid:document:0x[0-9a-f]+$'
    },
    $schema: {
      type: 'string',
      format: 'uri',
      const: 'https://dummyjson.com/c/6ad6-4d21-4b79-affa'
    },
    title: {
      type: 'string'
    },
    type: {
      type: 'string',
      const: 'object'
    },
    properties: {
      type: 'object',
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['string', 'integer', 'number', 'boolean']
            },
            $ref: {
              type: 'string',
              format: 'uri'
            },
            format: {
              type: 'string',
              enum: ['date', 'time', 'uri']
            }
          },
          oneOf: [
            {
              required: ['type']
            },
            {
              required: ['$ref']
            }
          ]
        }
      }
    }
  },
  required: ['$id', 'title', '$schema', 'properties', 'type']
};

export const VCModel: Schema = {
  $schema: 'http://json-schema.org/draft-07/schema',
  oneOf: [
    // Option A): conforms to draft-01 of the VC meta sschema, which defines that the VC's $schema property must be equal to the VC meta schema's $id.
    { $ref: VCModelDraft01.$id },
    // Option B): The VC's $schema property references V1 of the VC meta schema, in which case this meta schema must apply.
    // The structure is different because V1 does not define the exact value of the $schema property because its $id is derived from the hash of its contents.
    {
      allOf: [
        // verifies that both of two (sub-)schemas validate against VC object.
        {
          // subschema 1: $schema is equal to VC meta schema V1's $id.
          properties: {
            $schema: {
              type: 'string',
              const: VCModelV1.$id
            }
          }
        },
        {
          // subschema 2: VC meta schema V1.
          $ref: VCModelV1.$id
        }
      ]
    }
  ],
  // VC meta schemas are embedded here, so that the references ($ref) can be resolved without having to load them first.
  definitions: {
    [VCModelDraft01.$id]: VCModelDraft01,
    [VCModelV1.$id]: VCModelV1
  }
};
