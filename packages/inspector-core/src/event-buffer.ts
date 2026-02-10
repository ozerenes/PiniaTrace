import type { TimelineEvent } from './types.js';

const DEFAULT_MAX_SIZE = 500;

/**
 * Ring buffer for timeline events. When full, oldest entries are overwritten.
 * Deterministic: order preserved; no internal timestamps.
 */
export class EventBuffer {
  private readonly maxSize: number;
  private buffer: (TimelineEvent | undefined)[];
  private start = 0;
  private length = 0;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    if (maxSize < 1) {
      throw new Error('EventBuffer maxSize must be >= 1');
    }
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  push(event: TimelineEvent): void {
    const index = (this.start + this.length) % this.maxSize;
    this.buffer[index] = event;
    if (this.length < this.maxSize) {
      this.length++;
    } else {
      this.start = (this.start + 1) % this.maxSize;
    }
  }

  size(): number {
    return this.length;
  }

  capacity(): number {
    return this.maxSize;
  }

  at(index: number): TimelineEvent | undefined {
    if (index < 0 || index >= this.length) {
      return undefined;
    }
    const i = (this.start + index) % this.maxSize;
    return this.buffer[i];
  }

  /** All events in chronological order. New array each call. */
  getEvents(): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    for (let i = 0; i < this.length; i++) {
      const e = this.at(i);
      if (e !== undefined) {
        out.push(e);
      }
    }
    return out;
  }

  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.start = 0;
    this.length = 0;
  }
}
