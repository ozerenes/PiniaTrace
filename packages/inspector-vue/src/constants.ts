/**
 * Symbol used to mark state updates that come from the inspector (time travel).
 * Pinia mutation payloads can be tagged so we ignore them in the timeline.
 */
export const INSPECTOR_ORIGIN = '__stateWeaverReplay' as const;
