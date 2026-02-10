import type { ImmutableSnapshot } from './immutable-snapshot.js';
import { isImmutableSnapshot } from './immutable-snapshot.js';
import type {
  Clock,
  IncrementalSnapshotPayload,
  JsonValue,
  SnapshotStrategyConfig,
  TimelineEvent,
} from './types.js';
import { applyPatch } from './apply-patch.js';
import { EventBuffer } from './event-buffer.js';

/** Stored snapshot: either full or incremental. */
export type SnapshotPayload = ImmutableSnapshot | IncrementalSnapshotPayload;

export interface CreateTimelineEngineOptions {
  readonly maxEvents: number;
  readonly snapshotStrategy: SnapshotStrategyConfig;
  readonly clock: Clock;
}

export interface TimelineEngine {
  /** Append an event to the timeline. */
  pushEvent(event: TimelineEvent): void;
  /** Register snapshot payload by id (for snapshot events). */
  registerSnapshot(id: string, payload: SnapshotPayload): void;
  /** All events in chronological order. */
  getTimeline(): TimelineEvent[];
  /** Get snapshot payload by id, or undefined. */
  getSnapshot(id: string): SnapshotPayload | undefined;
  /** Current time from injected clock (deterministic). */
  now(): number;
  /** Snapshot strategy config (for adapter to decide full vs incremental). */
  getSnapshotStrategy(): SnapshotStrategyConfig;
  /** Clear all events and snapshots. */
  clear(): void;
}

/**
 * Creates the timeline engine: event buffer + snapshot registry.
 * No framework references; time from clock only.
 */
export function createTimelineEngine(
  options: CreateTimelineEngineOptions
): TimelineEngine {
  const { maxEvents, snapshotStrategy, clock } = options;
  const eventBuffer = new EventBuffer(maxEvents);
  const snapshots = new Map<string, SnapshotPayload>();

  return {
    pushEvent(event: TimelineEvent): void {
      eventBuffer.push(event);
    },

    registerSnapshot(id: string, payload: SnapshotPayload): void {
      snapshots.set(id, payload);
    },

    getTimeline(): TimelineEvent[] {
      return eventBuffer.getEvents();
    },

    getSnapshot(id: string): SnapshotPayload | undefined {
      return snapshots.get(id);
    },

    now(): number {
      return clock.now();
    },

    getSnapshotStrategy(): SnapshotStrategyConfig {
      return snapshotStrategy;
    },

    clear(): void {
      eventBuffer.clear();
      snapshots.clear();
    },
  };
}

/**
 * Resolves a snapshot id to full state. For full snapshots returns state;
 * for incremental, resolves base then applies changes. Returns undefined if not found.
 */
export function resolveSnapshotState(
  engine: TimelineEngine,
  snapshotId: string
): JsonValue | undefined {
  const payload = engine.getSnapshot(snapshotId);
  if (payload === undefined) return undefined;
  if (isImmutableSnapshot(payload)) {
    return payload.state as JsonValue;
  }
  const inc = payload as IncrementalSnapshotPayload;
  const baseState = resolveSnapshotState(engine, inc.baseSnapshotId);
  if (baseState === undefined) return undefined;
  const mutable = structuredClone(baseState) as Record<string, unknown> | unknown[];
  applyPatch(mutable, inc.changes);
  return mutable as JsonValue;
}
