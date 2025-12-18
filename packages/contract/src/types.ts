/**
 * Contract type definitions.
 * Only exports TypeScript types - no runtime dependencies.
 * Types are automatically extracted from contract.ts.
 */

import type { Static } from 'typebox';
import type { contract } from './contract';

// Automatically derive types from contract.ts (type-only imports)
export type EventPayloads = {
  [K in keyof typeof contract.events]: Static<(typeof contract.events)[K]>;
};

export type MethodPayloads = {
  [K in keyof typeof contract.methods]: Static<(typeof contract.methods)[K]>;
};

export type EventName = keyof EventPayloads;
export type EventPayload<T extends EventName> = EventPayloads[T];

export type MethodName = keyof MethodPayloads;
export type MethodPayload<T extends MethodName> = MethodPayloads[T];
