import type { MutationRecord } from './types.js';

const DEFAULT_MAX_SIZE = 500;

/**
 * Ring buffer of mutation records. When full, oldest entries are overwritten.
 * All operations are O(1) except getRecords() which is O(n) where n = size.
 */
export class TimelineBuffer {
  private readonly maxSize: number;
  private buffer: (MutationRecord | undefined)[];
  private start = 0;
  private length = 0;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    if (maxSize < 1) {
      throw new Error('TimelineBuffer maxSize must be >= 1');
    }
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  /** Appends a record. If buffer is full, oldest is dropped. */
  push(record: MutationRecord): void {
    const index = (this.start + this.length) % this.maxSize;
    this.buffer[index] = record;
    if (this.length < this.maxSize) {
      this.length++;
    } else {
      this.start = (this.start + 1) % this.maxSize;
    }
  }

  /** Number of records currently in the buffer. */
  size(): number {
    return this.length;
  }

  /** Maximum capacity. */
  capacity(): number {
    return this.maxSize;
  }

  /** Record at logical index [0 .. size()-1]. Returns undefined if out of range. */
  at(index: number): MutationRecord | undefined {
    if (index < 0 || index >= this.length) {
      return undefined;
    }
    const i = (this.start + index) % this.maxSize;
    return this.buffer[i];
  }

  /** All records in chronological order (oldest first). New array each call. */
  getRecords(): MutationRecord[] {
    const out: MutationRecord[] = [];
    for (let i = 0; i < this.length; i++) {
      const r = this.at(i);
      if (r !== undefined) {
        out.push(r);
      }
    }
    return out;
  }

  /** Clears the buffer. */
  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.start = 0;
    this.length = 0;
  }
}
