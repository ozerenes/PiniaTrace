import type { DeepChange, Path, PathSegment } from './types.js';

/**
 * Applies a list of deep changes to a mutable state object in place.
 * Used for patch-based replay (time travel). Paths must be valid.
 * Does not create new references for unchanged branches (reactivity-friendly).
 */
export function applyPatch(
  state: Record<string, unknown> | unknown[],
  changes: readonly DeepChange[]
): void {
  for (const change of changes) {
    applySingleChange(state, change.path, change.next);
  }
}

function applySingleChange(
  root: Record<string, unknown> | unknown[],
  path: readonly PathSegment[],
  value: unknown
): void {
  if (path.length === 0) {
    replaceRoot(root, value);
    return;
  }
  const [head, ...rest] = path;
  if (rest.length === 0) {
    setAt(root, head, value);
    return;
  }
  const parent = getAt(root, head);
  if (parent === undefined || parent === null) {
    const nextContainer = createContainer(rest[0]);
    setAt(root, head, nextContainer);
    applySingleChange(
      nextContainer as Record<string, unknown> | unknown[],
      rest,
      value
    );
    return;
  }
  if (isContainer(parent)) {
    applySingleChange(
      parent as Record<string, unknown> | unknown[],
      rest,
      value
    );
  } else {
    const nextContainer = createContainer(rest[0]);
    setAt(root, head, nextContainer);
    applySingleChange(
      nextContainer as Record<string, unknown> | unknown[],
      rest,
      value
    );
  }
}

function replaceRoot(
  root: Record<string, unknown> | unknown[],
  value: unknown
): void {
  if (Array.isArray(root)) {
    root.length = 0;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        root.push(value[i]);
      }
    }
    return;
  }
  const keys = Object.keys(root);
  for (const k of keys) {
    delete root[k];
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      root[k] = obj[k];
    }
  }
}

function getAt(
  root: Record<string, unknown> | unknown[],
  segment: PathSegment
): unknown {
  if (typeof segment === 'string') {
    return (root as Record<string, unknown>)[segment];
  }
  return (root as unknown[])[segment];
}

function setAt(
  root: Record<string, unknown> | unknown[],
  segment: PathSegment,
  value: unknown
): void {
  if (typeof segment === 'string') {
    (root as Record<string, unknown>)[segment] = value;
  } else {
    (root as unknown[])[segment] = value;
  }
}

function isContainer(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype)
  );
}

function createContainer(segment: PathSegment): Record<string, unknown> | unknown[] {
  return typeof segment === 'number' ? [] : {};
}
