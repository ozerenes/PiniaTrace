import type { Store } from 'pinia';
import type { JsonValue, Path, TimelineEvent } from 'inspector-core';

/** Pinia store state is a plain object (serializable for our purposes). */
export type StoreState = Record<string, unknown>;

/** Context passed to the Pinia plugin; shared so enable/disable and replay state are visible. */
export interface WeaverContext {
  enabled: () => boolean;
  replaying: () => boolean;
  /** If set, only these store ids are tracked. */
  storeFilter: ReadonlySet<string> | null;
  pushEvent: (event: TimelineEvent) => void;
  registerSnapshot: (id: string, payload: import('inspector-core').SnapshotPayload) => void;
  createSnapshotId: () => string;
  createEventId: () => string;
  now: () => number;
  /** Capture full state of store as JSON (for snapshots). */
  captureState: (store: Store<string, StoreState>) => JsonValue;
  /** Strategy: do we need full or incremental snapshot for this store. */
  getSnapshotKind: (storeId: string) => 'full' | 'incremental';
  /** Last known state per store id (for previous value in mutations and incremental base). */
  getLastState: (storeId: string) => JsonValue | undefined;
  setLastState: (storeId: string, state: JsonValue) => void;
}

/** Payload we attach to $patch when applying time-travel state (so we can ignore in $subscribe). */
export interface ReplayPayload {
  [key: string]: unknown;
  __stateWeaverReplay?: true;
}

/** Serialized session for export/import. */
export interface SerializedSession {
  readonly version: number;
  readonly exportedAt: number;
  readonly events: ReadonlyArray<TimelineEvent>;
  readonly snapshots: ReadonlyArray<{
    id: string;
    payload: import('inspector-core').SnapshotPayload;
  }>;
}
