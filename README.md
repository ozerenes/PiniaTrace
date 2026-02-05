# PiniaTrace

Realtime collaborative state inspector for Vue 3 (Pinia-based). Developer tool to observe stores, track mutations, time-travel debug, and sync timelines across clients.

## Architecture

- **Monorepo** (pnpm workspaces): shared tooling, strict TypeScript, one install.
- **packages/inspector-core**: Framework-agnostic types, timeline buffer, diff, serialization. No Vue.
- **packages/inspector-vue**: Pinia plugin + Vue composables; uses `inspector-core`.
- **packages/inspector-server**: WebSocket server for room-based realtime sync.
- **apps/demo-vue-app**: Example Vue app and minimal inspector UI.

## Trade-offs

- **Core vs Vue**: Core is pure TS and testable without a runtime; Vue adapter is the only place that touches Pinia/Vue.
- **Ring buffer**: Timeline has a fixed max size to bound memory; oldest entries are dropped when full.
- **Serialization**: Only JSON-serializable state is recorded so timelines can be replayed and synced over the wire.
- **No Vue Devtools dependency**: Works standalone; can be integrated with Devtools later if desired.

## Setup

```bash
pnpm install
pnpm build        # all packages
pnpm typecheck    # all packages
pnpm lint
pnpm format:check
```

## Packages

| Package            | Purpose                          |
|--------------------|----------------------------------|
| `inspector-core`   | Types, TimelineBuffer, diff, serialize |
| `inspector-vue`    | Pinia plugin, composables (Step 3+)     |
| `inspector-server` | WebSocket sync (Step 5+)               |

## Requirements

- Node ≥20
- Vue 3, Pinia (for app and inspector-vue)
