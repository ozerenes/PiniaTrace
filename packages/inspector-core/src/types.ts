/**
 * JSON-serializable value. No functions, symbols, or undefined.
 * undefined in object values is omitted when serializing.
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/**
 * Immutable snapshot of a store's state at a point in time.
 * All fields are serializable for replay and sync.
 */
export interface StateSnapshot<T = JsonValue> {
  readonly id: string;
  readonly storeId: string;
  readonly state: T;
  readonly timestamp: number;
}

/**
 * Single key-level change for shallow diff.
 */
export interface ShallowChange {
  readonly key: string;
  readonly previous: JsonValue | undefined;
  readonly next: JsonValue | undefined;
}

/**
 * Path into a nested object. Empty = root.
 */
export type PathSegment = string | number;
export type Path = readonly PathSegment[];

/**
 * One node in a deep diff: path + what changed there.
 */
export interface DeepChange {
  readonly path: Path;
  readonly previous: JsonValue | undefined;
  readonly next: JsonValue | undefined;
}

/**
 * Mode for diff: shallow (top-level keys only) or deep (recursive).
 */
export type DiffMode = 'shallow' | 'deep';

/**
 * Describes a single mutation applied to a store.
 * Patch is the minimal path-value form for deterministic replay.
 */
export interface MutationRecord<T = JsonValue> {
  readonly id: string;
  readonly storeId: string;
  readonly timestamp: number;
  /** Path to the changed value; empty = full replace at root */
  readonly path: Path;
  /** New value at path (serializable) */
  readonly value: T;
  /** Previous value at path, for display and time-travel undo */
  readonly previousValue: T | undefined;
}
