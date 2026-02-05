# inspector-core

Framework-agnostic core for the state inspector. No Vue or Pinia imports.

## Public API

- **Types**: `StateSnapshot`, `MutationRecord`, `Path`, `ShallowChange`, `DeepChange`, `DiffMode`, `JsonValue`.
- **Diff**: `shallowDiff(prev, next)`, `deepDiff(prev, next, path?)`, `diff(prev, next, mode)`.
- **Timeline**: `TimelineBuffer(maxSize?)` — ring buffer of `MutationRecord`; `push`, `at`, `getRecords`, `clear`, `size`, `capacity`.
- **Serialization**: `serializeSnapshot` / `deserializeSnapshot`, `serializeMutation` / `deserializeMutation`.

## Behavior

- **Deterministic**: Diff key order and buffer order are stable; serialization is JSON.
- **Memory-bounded**: Buffer drops oldest records when at capacity.
- **Serializable only**: Snapshot state and mutation value/previousValue are JSON-serializable for sync and replay.
