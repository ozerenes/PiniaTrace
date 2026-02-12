import type { Pinia } from 'pinia';
import { applyPatch, resolveSnapshotState } from 'inspector-core';
import type {
  DeepChange,
  JsonValue,
  TimelineEngine,
  TimelineEvent,
  TimelineEventAction,
  TimelineEventMutation,
  TimelineEventSnapshot,
} from 'inspector-core';
import type { StoreState } from './types.js';

/**
 * Computes the state of each store at the given timeline index by replaying
 * events from the start. Patch-based; no store re-creation.
 */
export function computeStateAtEventIndex(
  engine: TimelineEngine,
  index: number
): Map<string, JsonValue> {
  const events = engine.getEventsUpTo(index);
  const stateByStore = new Map<string, JsonValue>();

  for (const event of events) {
    const storeId = event.storeId;

    switch (event.type) {
      case 'mutation': {
        const mut = event as TimelineEventMutation;
        const current = stateByStore.get(storeId) ?? {};
        const mutable =
          typeof current === 'object' && current !== null && !Array.isArray(current)
            ? (current as Record<string, unknown>)
            : {};
        const clone = structuredClone(mutable) as Record<string, unknown>;
        const change: DeepChange = {
          path: mut.path,
          previous: mut.previousValue,
          next: mut.value,
        };
        applyPatch(clone, [change]);
        stateByStore.set(storeId, clone as JsonValue);
        break;
      }
      case 'snapshot': {
        const snap = event as TimelineEventSnapshot;
        const state = resolveSnapshotState(engine, snap.snapshotId);
        if (state !== undefined) {
          stateByStore.set(storeId, state);
        }
        break;
      }
      case 'action': {
        const act = event as TimelineEventAction;
        const afterId = act.afterSnapshotId;
        if (afterId) {
          const state = resolveSnapshotState(engine, afterId);
          if (state !== undefined) {
            stateByStore.set(storeId, state);
          }
        }
        break;
      }
      case 'remote':
        // Remote events carry payload; treat as full state for that store if desired.
        stateByStore.set(storeId, event.payload);
        break;
    }
  }

  return stateByStore;
}

/**
 * Applies a full state to a Pinia store in a reactivity-safe way (same store instance).
 * Caller must set replaying=true before and false after so the plugin does not record this.
 */
export function applySnapshotToStore(
  store: { $patch: (payload: StoreState | ((state: StoreState) => void)) => void; $state: StoreState },
  state: JsonValue
): void {
  const target = state as StoreState;
  store.$patch((current: StoreState) => {
    const keys = Object.keys(current);
    for (const k of keys) {
      delete current[k];
    }
    Object.assign(current, target);
  });
}

/**
 * Time-travel: apply state at the given event index to all affected Pinia stores.
 * setReplaying(true) must be called before and setReplaying(false) after so the inspector does not record these updates.
 */
export function applyStateAtEventIndex(
  pinia: Pinia,
  engine: TimelineEngine,
  index: number,
  setReplaying: (value: boolean) => void
): void {
  const stateByStore = computeStateAtEventIndex(engine, index);
  const piniaStores = (pinia as unknown as { _s: Map<string, { $patch: (p: unknown) => void; $state: StoreState }> })._s;
  if (!piniaStores || !(piniaStores instanceof Map)) {
    return;
  }
  setReplaying(true);
  try {
    for (const [storeId, state] of stateByStore) {
      const store = piniaStores.get(storeId);
      if (store) {
        applySnapshotToStore(store, state);
      }
    }
  } finally {
    setReplaying(false);
  }
}
