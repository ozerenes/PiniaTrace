import type { JsonValue } from './types.js';

/** Version for schema evolution; current format. */
export const SNAPSHOT_VERSION = 1;

/**
 * Immutable snapshot: deep frozen, serializable, versioned.
 * Used for full state capture and replay; never mutated.
 */
export interface ImmutableSnapshot<T = JsonValue> {
  readonly version: number;
  readonly id: string;
  readonly storeId: string;
  readonly state: T;
  readonly timestamp: number;
}

/**
 * Deep-freezes a value in place. Used to enforce immutability of snapshot state.
 * Only plain objects and arrays are frozen; primitives are returned as-is.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      deepFreeze(value[i]);
    }
    return Object.freeze(value) as T;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return Object.freeze(value) as T;
}

/**
 * Creates an immutable snapshot: clones state (so we can freeze without affecting
 * the original), deep-freezes it, and wraps with version and ids.
 * Caller must provide deterministic id and timestamp (e.g. from clock).
 */
export function createImmutableSnapshot<T extends JsonValue>(params: {
  id: string;
  storeId: string;
  state: T;
  timestamp: number;
  version?: number;
}): ImmutableSnapshot<T> {
  const version = params.version ?? SNAPSHOT_VERSION;
  const stateClone = structuredClone(params.state);
  const frozen = deepFreeze(stateClone) as T;
  return {
    version,
    id: params.id,
    storeId: params.storeId,
    state: frozen,
    timestamp: params.timestamp,
  };
}

/**
 * Returns true if value is a valid ImmutableSnapshot shape (versioned, has id/storeId/state/timestamp).
 */
export function isImmutableSnapshot(value: unknown): value is ImmutableSnapshot {
  if (value === null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o['version'] === 'number' &&
    typeof o['id'] === 'string' &&
    typeof o['storeId'] === 'string' &&
    'state' in o &&
    typeof o['timestamp'] === 'number'
  );
}
