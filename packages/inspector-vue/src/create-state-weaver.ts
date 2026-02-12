import type { Pinia } from 'pinia';
import type { Store } from 'pinia';
import {
  createTimelineEngine,
  getSnapshotStrategy,
  resolveSnapshotState,
  type Clock,
  type SnapshotStrategyConfig,
  type TimelineEngine,
  type TimelineEvent,
  type TimelineEventAction,
  type TimelineEventSnapshot,
} from 'inspector-core';
import { defaultIdGenerator } from './id-generator.js';
import { installPiniaInspector } from './plugin.js';
import { applyStateAtEventIndex } from './time-travel.js';
import type { SerializedSession, StoreState, WeaverContext } from './types.js';

const SESSION_VERSION = 1;

export interface CreateStateWeaverOptions {
  readonly pinia: Pinia;
  enabled?: boolean;
  /** If provided, only these store ids are tracked. */
  stores?: readonly string[];
  maxEvents?: number;
  snapshotStrategy?: SnapshotStrategyConfig;
  clock?: Clock;
}

export interface StateWeaverApi {
  enable(): void;
  disable(): void;
  goTo(eventId: string): void;
  getTimeline(): TimelineEvent[];
  exportSession(): SerializedSession;
  importSession(session: SerializedSession): void;
}

/**
 * Captures store state as JSON (plain object). Used for snapshots and last-state tracking.
 */
function captureStoreState(store: Store<string, StoreState>): import('inspector-core').JsonValue {
  const raw = store.$state as Record<string, unknown>;
  return JSON.parse(JSON.stringify(raw)) as import('inspector-core').JsonValue;
}

export function createStateWeaver(options: CreateStateWeaverOptions): StateWeaverApi {
  const pinia = options.pinia;
  const maxEvents = options.maxEvents ?? 500;
  const snapshotStrategy: SnapshotStrategyConfig =
    options.snapshotStrategy ?? { default: 'full' };
  const clock: Clock = options.clock ?? { now: () => Date.now() };

  const engine: TimelineEngine = createTimelineEngine({
    maxEvents,
    snapshotStrategy,
    clock,
  });

  let enabled = options.enabled ?? false;
  let replaying = false;
  const lastStateByStore = new Map<string, import('inspector-core').JsonValue>();
  const storeFilter: Set<string> | null = options.stores
    ? new Set(options.stores)
    : null;

  const createEventId = defaultIdGenerator('ev');
  const createSnapshotId = defaultIdGenerator('snap');

  const context: WeaverContext = {
    enabled: () => enabled,
    replaying: () => replaying,
    storeFilter,
    pushEvent: (event: TimelineEvent) => engine.pushEvent(event),
    registerSnapshot: (id, payload) => engine.registerSnapshot(id, payload),
    createSnapshotId,
    createEventId,
    now: () => clock.now(),
    captureState: captureStoreState,
    getSnapshotKind: (storeId: string) =>
      getSnapshotStrategy(snapshotStrategy, storeId),
    getLastState: (storeId: string) => lastStateByStore.get(storeId),
    setLastState: (storeId: string, state: import('inspector-core').JsonValue) => {
      lastStateByStore.set(storeId, state);
    },
  };

  const stopPlugin = installPiniaInspector(pinia, context);

  return {
    enable(): void {
      enabled = true;
    },

    disable(): void {
      enabled = false;
    },

    goTo(eventId: string): void {
      const index = engine.getEventIndexById(eventId);
      if (index < 0) return;
      applyStateAtEventIndex(pinia, engine, index, (value: boolean) => {
        replaying = value;
      });
    },

    getTimeline(): TimelineEvent[] {
      return engine.getTimeline();
    },

    exportSession(): SerializedSession {
      const events = engine.getTimeline();
      const snapshotIds = new Set<string>();
      for (const e of events) {
        if (e.type === 'snapshot') {
          snapshotIds.add((e as TimelineEventSnapshot).snapshotId);
        }
        if (e.type === 'action') {
          const a = e as TimelineEventAction;
          if (a.beforeSnapshotId) snapshotIds.add(a.beforeSnapshotId);
          if (a.afterSnapshotId) snapshotIds.add(a.afterSnapshotId);
        }
      }
      const snapshots: Array<{ id: string; payload: import('inspector-core').SnapshotPayload }> = [];
      for (const id of snapshotIds) {
        const payload = engine.getSnapshot(id);
        if (payload) {
          snapshots.push({ id, payload });
        }
      }
      return {
        version: SESSION_VERSION,
        exportedAt: clock.now(),
        events,
        snapshots,
      };
    },

    importSession(session: SerializedSession): void {
      engine.clear();
      for (const { id, payload } of session.snapshots) {
        engine.registerSnapshot(id, payload);
      }
      for (const event of session.events) {
        engine.pushEvent(event);
      }
    },
  };
}
