import type {
  DeepChange,
  DiffMode,
  JsonValue,
  Path,
  ShallowChange,
} from './types.js';

const OWN_KEYS = Object.keys as (o: object) => string[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Only enumerable own keys; deterministic order (sorted for stability). */
function getKeys(obj: object): string[] {
  return OWN_KEYS(obj).slice().sort();
}

/**
 * Shallow diff: compares only top-level keys of two objects.
 * Deterministic: keys are sorted; result order is stable.
 */
export function shallowDiff(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined
): ShallowChange[] {
  const result: ShallowChange[] = [];
  const prev = previous ?? {};
  const nextObj = next ?? {};
  const allKeys = new Set([...getKeys(prev), ...getKeys(nextObj)]);

  for (const key of allKeys) {
    const prevVal = key in prev ? (prev[key] as unknown) : undefined;
    const nextVal = key in nextObj ? (nextObj[key] as unknown) : undefined;
    if (prevVal !== nextVal) {
      result.push({
        key,
        previous: toJsonValue(prevVal),
        next: toJsonValue(nextVal),
      });
    }
  }

  return result;
}

/**
 * Deep diff: recursively compares two values and reports all changes.
 * Only traverses plain objects and arrays; other values are compared by reference.
 * Deterministic: object keys sorted; no cycle handling (assume acyclic state).
 */
export function deepDiff(
  previous: unknown,
  next: unknown,
  path: Path = []
): DeepChange[] {
  const result: DeepChange[] = [];

  if (isPlainObject(previous) && isPlainObject(next)) {
    const allKeys = new Set([
      ...getKeys(previous),
      ...getKeys(next as Record<string, unknown>),
    ]);
    for (const key of allKeys) {
      const prevChild = key in previous ? previous[key] : undefined;
      const nextChild = key in (next as Record<string, unknown>)
        ? (next as Record<string, unknown>)[key]
        : undefined;
      const childPath = [...path, key];

      if (isPlainObject(prevChild) && isPlainObject(nextChild)) {
        result.push(...deepDiff(prevChild, nextChild, childPath));
      } else if (isPlainArray(prevChild) && isPlainArray(nextChild)) {
        result.push(...deepDiffArrays(prevChild, nextChild, childPath));
      } else if (prevChild !== nextChild) {
        result.push({
          path: childPath,
          previous: toJsonValue(prevChild),
          next: toJsonValue(nextChild),
        });
      }
    }
    return result;
  }

  if (isPlainArray(previous) && isPlainArray(next)) {
    return deepDiffArrays(previous, next, path);
  }

  if (previous !== next) {
    result.push({
      path,
      previous: toJsonValue(previous),
      next: toJsonValue(next),
    });
  }
  return result;
}

function deepDiffArrays(
  prev: unknown[],
  next: unknown[],
  path: Path
): DeepChange[] {
  const result: DeepChange[] = [];
  const maxLen = Math.max(prev.length, next.length);

  for (let i = 0; i < maxLen; i++) {
    const indexPath = [...path, i];
    const prevItem = i < prev.length ? prev[i] : undefined;
    const nextItem = i < next.length ? next[i] : undefined;

    if (isPlainObject(prevItem) && isPlainObject(nextItem)) {
      result.push(...deepDiff(prevItem, nextItem, indexPath));
    } else if (isPlainArray(prevItem) && isPlainArray(nextItem)) {
      result.push(...deepDiffArrays(prevItem, nextItem, indexPath));
    } else if (prevItem !== nextItem) {
      result.push({
        path: indexPath,
        previous: toJsonValue(prevItem),
        next: toJsonValue(nextItem),
      });
    }
  }
  return result;
}

/**
 * Dispatches to shallow or deep diff based on mode.
 */
export function diff(
  previous: unknown,
  next: unknown,
  mode: DiffMode
): ShallowChange[] | DeepChange[] {
  if (mode === 'shallow') {
    return shallowDiff(
      previous as Record<string, unknown> | undefined,
      next as Record<string, unknown> | undefined
    );
  }
  return deepDiff(previous, next);
}

/** Coerce to JSON-serializable; non-serializable replaced with undefined for "previous/next" reporting. */
function toJsonValue(v: unknown): JsonValue | undefined {
  if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return v as JsonValue;
  }
  if (Array.isArray(v)) {
    return v.map(toJsonValue) as JsonValue[];
  }
  if (isPlainObject(v)) {
    const out: Record<string, JsonValue | undefined> = {};
    for (const key of getKeys(v)) {
      out[key] = toJsonValue(v[key]);
    }
    return out;
  }
  return undefined;
}
