import type { MutationRecord, StateSnapshot } from './types.js';

/**
 * JSON-serializable representation of StateSnapshot (state already plain).
 */
export function serializeSnapshot(snapshot: StateSnapshot): string {
  return JSON.stringify({
    id: snapshot.id,
    storeId: snapshot.storeId,
    state: snapshot.state,
    timestamp: snapshot.timestamp,
  });
}

export function deserializeSnapshot<T = unknown>(raw: string): StateSnapshot<T> {
  const parsed = JSON.parse(raw) as {
    id: string;
    storeId: string;
    state: T;
    timestamp: number;
  };
  return {
    id: parsed.id,
    storeId: parsed.storeId,
    state: parsed.state,
    timestamp: parsed.timestamp,
  };
}

/**
 * Path is array of string | number; value and previousValue are JSON-serializable.
 */
export function serializeMutation(record: MutationRecord): string {
  return JSON.stringify({
    id: record.id,
    storeId: record.storeId,
    timestamp: record.timestamp,
    path: record.path,
    value: record.value,
    previousValue: record.previousValue,
  });
}

export function deserializeMutation<T = unknown>(raw: string): MutationRecord<T> {
  const parsed = JSON.parse(raw) as {
    id: string;
    storeId: string;
    timestamp: number;
    path: readonly (string | number)[];
    value: T;
    previousValue: T | undefined;
  };
  return {
    id: parsed.id,
    storeId: parsed.storeId,
    timestamp: parsed.timestamp,
    path: parsed.path,
    value: parsed.value,
    previousValue: parsed.previousValue,
  };
}
