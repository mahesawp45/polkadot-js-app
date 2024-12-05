// [object Object]
// SPDX-License-Identifier: Apache-2.0

export interface SignerInterface<
  Alg extends string = string,
  Id extends string = string
> {
  algorithm: Alg;
  id: Id;
  sign: (input: { data: Uint8Array }) => Promise<Uint8Array>;
}
