/** Deterministic-ish id generator. Caller can inject for tests. */
export interface IdGenerator {
  (): string;
}

let sequence = 0;

/**
 * Default id generator: prefix + timestamp + seq to avoid collisions in same tick.
 * Not cryptographically unique; sufficient for timeline event ids.
 */
export function defaultIdGenerator(prefix: string): IdGenerator {
  return (): string => {
    sequence += 1;
    return `${prefix}-${Number(Date.now()).toString(36)}-${sequence}`;
  };
}
