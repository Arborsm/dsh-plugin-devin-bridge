/**
 * Host-face Typert manifest for the `devin` remote service.
 *
 * The Typert loader discovers this file through `exports["./typert"]` and
 * registers every invocation with the gateway; descriptors must match the
 * service object provided in `src/index.ts` (ctx.provide('devin', service))
 * and the client mirror in `src/client/remote.ts` exactly.
 */
/** Minimal parser face every strict codec factory returns. */
interface TypertSchema<T> {
  parse(value: unknown): T;
}
/** Strict codec shape the Typert loader and gateway accept. */
interface TypertStrictCodec<T> {
  mode: 'strict';
  typeSymbol: string;
  create(): TypertSchema<T>;
}
/** Wires of the `devin` namespace, in service order. */
declare const DEVIN_INVOCATIONS: ({
  id: string;
  service: string;
  namespace: string;
  method: string;
  invocation: {
    kind: "direct";
  };
  parameters: never[];
  result: TypertStrictCodec<Record<string, unknown>>;
  description: string;
} | {
  id: string;
  service: string;
  namespace: string;
  method: string;
  invocation: {
    kind: "direct";
  };
  parameters: never[];
  result: TypertStrictCodec<Record<string, unknown>[]>;
  description: string;
})[];
/** The manifest the Typert loader registers for this package. */
declare const TYPERT: {
  package: string;
  face: "host";
  schemas: never[];
  invocations: ({
    id: string;
    service: string;
    namespace: string;
    method: string;
    invocation: {
      kind: "direct";
    };
    parameters: never[];
    result: TypertStrictCodec<Record<string, unknown>>;
    description: string;
  } | {
    id: string;
    service: string;
    namespace: string;
    method: string;
    invocation: {
      kind: "direct";
    };
    parameters: never[];
    result: TypertStrictCodec<Record<string, unknown>[]>;
    description: string;
  })[];
  model: {
    services: {
      description: string;
      summary: string;
      tags: string[];
      key: string;
      exportName: string;
      members: {
        kind: string;
        name: string;
        signature: string;
        summary: string;
      }[];
      types: never[];
    }[];
    events: never[];
    objects: never[];
  };
  events: never[];
  objects: never[];
};
export { DEVIN_INVOCATIONS, TYPERT, TypertSchema, TypertStrictCodec };
//# sourceMappingURL=typert.host.d.ts.map