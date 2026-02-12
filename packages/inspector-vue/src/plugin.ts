import type { Pinia } from 'pinia';
import type { Store } from 'pinia';
import { createImmutableSnapshot, deepDiff } from 'inspector-core';
import type {
  ChangeOrigin,
  JsonValue,
  Path,
  TimelineEventAction,
  TimelineEventMutation,
} from 'inspector-core';
import type { StoreState } from './types.js';
import type { WeaverContext } from './types.js';

/**
 * Pinia plugin that subscribes to $subscribe and $onAction, pushes TimelineEvents only.
 * Never mutates state; replaying and filtering are handled via context.
 */
function createStoreInspector(context: WeaverContext) {
  return (store: Store<string, StoreState>): void => {
    const storeId = store.$id;

    store.$subscribe((_mutation: unknown, _state: StoreState) => {
      if (!context.enabled()) return;
      if (context.replaying()) {
        context.setLastState(storeId, context.captureState(store));
        return;
      }
      if (context.storeFilter !== null && !context.storeFilter.has(storeId)) return;

      const nextState = context.captureState(store) as JsonValue;
      const previousState = context.getLastState(storeId);

      const changes = deepDiff(previousState ?? {}, nextState);

      for (const change of changes) {
        const event: TimelineEventMutation = {
          type: 'mutation',
          id: context.createEventId(),
          storeId,
          timestamp: context.now(),
          origin: 'local' as ChangeOrigin,
          path: change.path as Path,
          value: change.next,
          previousValue: change.previous,
        };
        context.pushEvent(event);
      }

      context.setLastState(storeId, nextState);
    });

    store.$onAction(({
      name,
      args,
      after,
    }: {
      name: string;
      args: unknown[];
      after: (resolved?: unknown) => void;
    }) => {
      if (!context.enabled()) return;
      if (context.replaying()) return;
      if (context.storeFilter !== null && !context.storeFilter.has(storeId)) return;

      const beforeState = context.captureState(store) as JsonValue;
      const beforeSnapshotId = context.createSnapshotId();
      context.registerSnapshot(
        beforeSnapshotId,
        createImmutableSnapshot({
          id: beforeSnapshotId,
          storeId,
          state: beforeState,
          timestamp: context.now(),
        })
      );

      after(() => {
        const afterState = context.captureState(store) as JsonValue;
        const afterSnapshotId = context.createSnapshotId();
        context.registerSnapshot(
          afterSnapshotId,
          createImmutableSnapshot({
            id: afterSnapshotId,
            storeId,
            state: afterState,
            timestamp: context.now(),
          })
        );
        const actionEvent: TimelineEventAction = {
          type: 'action',
          id: context.createEventId(),
          storeId,
          timestamp: context.now(),
          origin: 'local',
          name,
          payload: args as JsonValue,
          beforeSnapshotId,
          afterSnapshotId,
        };
        context.pushEvent(actionEvent);
        context.setLastState(storeId, afterState);
      });
    });
  };
}

export function installPiniaInspector(pinia: Pinia, context: WeaverContext): () => void {
  const inspector = createStoreInspector(context);
  return pinia.use(inspector);
}
