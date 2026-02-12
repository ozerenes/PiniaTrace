export type {
  ChangeOrigin,
  Clock,
  DeepChange,
  DiffMode,
  IncrementalSnapshotPayload,
  JsonPrimitive,
  JsonValue,
  MutationRecord,
  Path,
  PathSegment,
  ShallowChange,
  SnapshotStrategyConfig,
  SnapshotStrategyKind,
  StateSnapshot,
  TimelineEvent,
  TimelineEventAction,
  TimelineEventMutation,
  TimelineEventRemote,
  TimelineEventSnapshot,
} from './types.js';

export { getSnapshotStrategy } from './types.js';
export { deepDiff, diff, shallowDiff } from './diff.js';
export { TimelineBuffer } from './timeline-buffer.js';
export {
  deserializeMutation,
  deserializeSnapshot,
  serializeMutation,
  serializeSnapshot,
} from './serialize.js';
export {
  createImmutableSnapshot,
  deepFreeze,
  isImmutableSnapshot,
  SNAPSHOT_VERSION,
} from './immutable-snapshot.js';
export type { ImmutableSnapshot } from './immutable-snapshot.js';
export { applyPatch } from './apply-patch.js';
export { EventBuffer } from './event-buffer.js';
export {
  createTimelineEngine,
  resolveSnapshotState,
} from './timeline-engine.js';
export type {
  CreateTimelineEngineOptions,
  SnapshotPayload,
  TimelineEngine,
} from './timeline-engine.js';
