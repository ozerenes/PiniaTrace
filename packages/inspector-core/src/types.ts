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

// --- Timeline events (union) ---

/** Origin of a change: local user, replay (time travel), or remote (sync). */
export type ChangeOrigin = 'local' | 'replay' | 'remote';

/** Event: store state was mutated (e.g. direct assignment or $patch). */
export interface TimelineEventMutation {
  readonly type: 'mutation';
  readonly id: string;
  readonly storeId: string;
  readonly timestamp: number;
  readonly origin: ChangeOrigin;
  readonly path: Path;
  readonly value: JsonValue;
  readonly previousValue: JsonValue | undefined;
}

/** Event: an action was invoked (before/after state captured separately). */
export interface TimelineEventAction {
  readonly type: 'action';
  readonly id: string;
  readonly storeId: string;
  readonly timestamp: number;
  readonly origin: ChangeOrigin;
  readonly name: string;
  readonly payload: JsonValue | undefined;
  /** Snapshot id of state before action (if captured). */
  readonly beforeSnapshotId: string | undefined;
  /** Snapshot id of state after action (if captured). */
  readonly afterSnapshotId: string | undefined;
}

/** Event: full or incremental snapshot was taken. */
export interface TimelineEventSnapshot {
  readonly type: 'snapshot';
  readonly id: string;
  readonly storeId: string;
  readonly timestamp: number;
  readonly origin: ChangeOrigin;
  /** Reference to immutable snapshot payload. */
  readonly snapshotId: string;
  /** If incremental, the base snapshot id this diff applies to. */
  readonly baseSnapshotId: string | undefined;
}

/** Event: change received from remote (collaboration/sync). */
export interface TimelineEventRemote {
  readonly type: 'remote';
  readonly id: string;
  readonly storeId: string;
  readonly timestamp: number;
  readonly payload: JsonValue;
  /** Opaque remote identifier for dedup. */
  readonly remoteId?: string;
}

export type TimelineEvent =
  | TimelineEventMutation
  | TimelineEventAction
  | TimelineEventSnapshot
  | TimelineEventRemote;

// --- Clock (injectable; no Date.now() in core) ---

export interface Clock {
  now(): number;
}

// --- Snapshot strategy ---

/** How to capture store state: full copy or incremental diff. */
export type SnapshotStrategyKind = 'full' | 'incremental';

/** Per-store strategy; default used when storeId not listed. */
export interface SnapshotStrategyConfig {
  readonly default: SnapshotStrategyKind;
  readonly perStore?: Readonly<Record<string, SnapshotStrategyKind>>;
}

/** Resolves strategy for a store. */
export function getSnapshotStrategy(
  config: SnapshotStrategyConfig,
  storeId: string
): SnapshotStrategyKind {
  return config.perStore?.[storeId] ?? config.default;
}

/** Payload for incremental snapshot: base snapshot id + deep changes to apply. */
export interface IncrementalSnapshotPayload {
  readonly baseSnapshotId: string;
  readonly changes: readonly DeepChange[];
}
